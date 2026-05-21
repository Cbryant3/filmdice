from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, func
from sqlalchemy.dialects.postgresql import insert as pg_insert
from datetime import datetime, timedelta, timezone
from typing import List

import random
import asyncio
from app.tmdb_client import (
    discover_movies, get_movie, get_movie_videos,
    get_watch_providers, get_release_dates, get_genres,
    poster_url, startup as tmdb_startup, shutdown as tmdb_shutdown,
)
from app.config import settings
from app.db import Base, engine, get_db
from app.models import UserMovieInteraction, UserPreferenceCache
from app.schemas import (
    RandomMovieRequest, RandomMovieResponse,
    InteractionUpsert, InteractionRecord,
    ForYouRequest, UserPreferencesResponse, GenreScore, DecadeScore,
)
from app.services import compute_preference_scores


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await tmdb_startup()
    yield
    await tmdb_shutdown()


app = FastAPI(title="FilmDice API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.allowed_origins.split(",")],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def extract_trailer_url(videos_json: dict) -> str | None:
    results = videos_json.get("results") or []
    for v in results:
        if v.get("site") == "YouTube" and v.get("type") == "Trailer" and v.get("key"):
            return f"https://www.youtube.com/watch?v={v['key']}"
    for v in results:
        if v.get("site") == "YouTube" and v.get("key"):
            return f"https://www.youtube.com/watch?v={v['key']}"
    return None


def extract_certification(release_dates_json: dict, region: str) -> str | None:
    for block in (release_dates_json.get("results") or []):
        if block.get("iso_3166_1") == region:
            for rd in (block.get("release_dates") or []):
                cert = (rd.get("certification") or "").strip()
                if cert:
                    return cert
    return None


def extract_providers(providers_json: dict, region: str) -> dict:
    region_block = (providers_json.get("results") or {}).get(region) or {}
    return {
        "region": region,
        "link": region_block.get("link"),
        "flatrate": region_block.get("flatrate") or [],
        "rent": region_block.get("rent") or [],
        "buy": region_block.get("buy") or [],
    }


# ---------------------------------------------------------------------------
# Cache helpers
# ---------------------------------------------------------------------------

async def _get_preference_scores(
    user_id: str, db: AsyncSession
) -> tuple[dict[int, float], dict[int, float], int, int]:
    """
    Returns (genre_scores, decade_scores, liked_count, total_interactions).
    Reads from UserPreferenceCache; recomputes and stores if cache is missing.
    """
    cache = await db.get(UserPreferenceCache, user_id)
    if cache is not None:
        genre_scores = {int(k): float(v) for k, v in (cache.genre_scores or {}).items()}
        decade_scores = {int(k): float(v) for k, v in (cache.decade_scores or {}).items()}
        return genre_scores, decade_scores, cache.liked_count, cache.total_interactions

    rows = (await db.execute(
        select(UserMovieInteraction).where(UserMovieInteraction.user_id == user_id)
    )).scalars().all()

    genre_scores, decade_scores = compute_preference_scores(list(rows))
    liked_count = sum(1 for r in rows if r.status == "liked")
    total_interactions = len(rows)

    await db.execute(
        pg_insert(UserPreferenceCache).values(
            user_id=user_id,
            genre_scores={str(k): v for k, v in genre_scores.items()},
            decade_scores={str(k): v for k, v in decade_scores.items()},
            liked_count=liked_count,
            total_interactions=total_interactions,
        ).on_conflict_do_update(
            constraint="user_preference_cache_pkey",
            set_={
                "genre_scores": {str(k): v for k, v in genre_scores.items()},
                "decade_scores": {str(k): v for k, v in decade_scores.items()},
                "liked_count": liked_count,
                "total_interactions": total_interactions,
                "updated_at": func.now(),
            },
        )
    )
    await db.commit()
    return genre_scores, decade_scores, liked_count, total_interactions


async def _invalidate_preference_cache(user_id: str, db: AsyncSession) -> None:
    await db.execute(
        delete(UserPreferenceCache).where(UserPreferenceCache.user_id == user_id)
    )


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/")
def root():
    return {"message": "FilmDice API is running. Go to /docs"}


@app.get("/health")
def health():
    return {"ok": True}


@app.get("/debug-key")
def debug_key():
    if not settings.tmdb_api_key:
        return {"has_key": False}
    return {"has_key": True, "len": len(settings.tmdb_api_key)}


@app.get("/tmdb-test")
async def tmdb_test():
    data = await get_movie(603)  # The Matrix
    return {
        "id": data["id"],
        "title": data.get("title"),
        "overview": data.get("overview"),
        "poster_url": poster_url(data.get("poster_path")),
    }


@app.get("/genres")
async def genres_list():
    """Returns all TMDB movie genre IDs and names."""
    return await get_genres()


@app.get("/movies/{movie_id}")
async def movie_detail(movie_id: int):
    """Full TMDB details for a single movie (for re-displaying saved cards)."""
    data = await get_movie(movie_id)
    videos_json = await get_movie_videos(movie_id)
    providers_json = await get_watch_providers(movie_id)
    release_dates_json = await get_release_dates(movie_id)

    region = "US"
    trailer_url = extract_trailer_url(videos_json)
    where_to_watch = extract_providers(providers_json, region)
    content_rating = extract_certification(release_dates_json, region)

    return RandomMovieResponse(
        id=int(data["id"]),
        title=data.get("title") or "Unknown title",
        overview=data.get("overview"),
        poster_url=poster_url(data.get("poster_path")),
        runtime=data.get("runtime"),
        trailer_url=trailer_url,
        where_to_watch=where_to_watch,
        content_rating=content_rating,
    )


@app.post("/random-movie", response_model=RandomMovieResponse)
async def random_movie(req: RandomMovieRequest, db: AsyncSession = Depends(get_db)):

    f = req.filters
    region = f.region or "US"
    rating_region = f.content_rating_region or region

    # Build discover params
    discover_params: dict = {
        "include_adult": "false",
        "include_video": "false",
        "sort_by": f.sort_by or "popularity.desc",
        "page": 1,
    }

    if f.region:
        discover_params["region"] = f.region
    if f.genre_ids:
        discover_params["with_genres"] = "|".join(map(str, f.genre_ids))
    if f.exclude_genre_ids:
        discover_params["without_genres"] = ",".join(map(str, f.exclude_genre_ids))
    if f.year_min:
        discover_params["primary_release_date.gte"] = f"{f.year_min}-01-01"
    if f.year_max:
        discover_params["primary_release_date.lte"] = f"{f.year_max}-12-31"
    if f.decades and not f.year_min and not f.year_max:
        decade_start = min(f.decades)
        decade_end   = max(f.decades) + 9
        discover_params["primary_release_date.gte"] = f"{decade_start}-01-01"
        discover_params["primary_release_date.lte"] = f"{decade_end}-12-31"
    if f.rating_min is not None:
        discover_params["vote_average.gte"] = str(f.rating_min)
    if f.rating_max is not None:
        discover_params["vote_average.lte"] = str(f.rating_max)
    if f.vote_count_min is not None:
        discover_params["vote_count.gte"] = str(f.vote_count_min)
    if f.runtime_min is not None:
        discover_params["with_runtime.gte"] = str(f.runtime_min)
    if f.runtime_max is not None:
        discover_params["with_runtime.lte"] = str(f.runtime_max)
    if f.language:
        discover_params["with_original_language"] = f.language

    # Push streaming filter into the discover call so TMDB pre-filters results
    if f.must_be_streaming:
        discover_params["watch_region"] = region
        discover_params["with_watch_monetization_types"] = "flatrate"

    # First call: learn total pages
    first = await discover_movies(discover_params)
    total_pages = min(int(first.get("total_pages") or 0), 500)
    if total_pages <= 0:
        raise HTTPException(status_code=404, detail="No movies found for those filters.")

    suppress_since = datetime.now(timezone.utc) - timedelta(days=req.suppress_days)

    for _ in range(req.reroll_max):
        page = random.randint(1, total_pages)
        discover_params["page"] = page

        page_data = await discover_movies(discover_params)
        results = page_data.get("results") or []
        if not results:
            continue

        pick = random.choice(results)
        movie_id = pick.get("id")
        if not movie_id:
            continue

        # DB check before any expensive TMDB calls
        q = select(UserMovieInteraction).where(
            UserMovieInteraction.user_id == req.user_id,
            UserMovieInteraction.tmdb_movie_id == int(movie_id),
        )
        row = (await db.execute(q)).scalar_one_or_none()
        if row:
            if row.skip or row.status in ("watched", "liked"):
                continue
            if row.last_surfaced_at and row.last_surfaced_at >= suppress_since:
                continue

        # Fetch details, trailer, providers, and cert concurrently
        details, videos_json, providers_json, release_dates_json = await asyncio.gather(
            get_movie(int(movie_id)),
            get_movie_videos(int(movie_id)),
            get_watch_providers(int(movie_id)),
            get_release_dates(int(movie_id)),
        )

        trailer_url = extract_trailer_url(videos_json)
        where_to_watch = extract_providers(providers_json, region)
        cert = extract_certification(release_dates_json, rating_region)

        # Safety net: confirm streaming even though TMDB pre-filtered
        if f.must_be_streaming and not where_to_watch["flatrate"]:
            continue

        # Content rating filter
        if f.content_rating_include and cert not in f.content_rating_include:
            continue
        if f.content_rating_exclude and cert in f.content_rating_exclude:
            continue

        # Extract preference data from discover result (no extra API call needed)
        raw_genre_ids: list[int] = pick.get("genre_ids") or []
        raw_release_date: str = pick.get("release_date") or ""
        raw_release_year: int | None = int(raw_release_date[:4]) if len(raw_release_date) >= 4 else None

        # Record as surfaced
        now = datetime.now(timezone.utc)
        if row:
            row.last_surfaced_at = now
            if not row.genre_ids and raw_genre_ids:
                row.genre_ids = raw_genre_ids
            if not row.release_year and raw_release_year:
                row.release_year = raw_release_year
        else:
            db.add(UserMovieInteraction(
                user_id=req.user_id,
                tmdb_movie_id=int(movie_id),
                status="unseen",
                skip=False,
                last_surfaced_at=now,
                genre_ids=raw_genre_ids or None,
                release_year=raw_release_year,
            ))
        await db.commit()

        return RandomMovieResponse(
            id=int(details["id"]),
            title=details.get("title") or "Unknown title",
            overview=details.get("overview"),
            poster_url=poster_url(details.get("poster_path")),
            runtime=details.get("runtime"),
            release_year=raw_release_year,
            trailer_url=trailer_url,
            where_to_watch=where_to_watch,
            content_rating=cert,
            is_for_you=False,
            genre_ids=raw_genre_ids or None,
        )

    raise HTTPException(status_code=404, detail="Could not find a movie after rerolls.")


@app.post("/interactions")
async def upsert_interaction(payload: InteractionUpsert, db: AsyncSession = Depends(get_db)):
    insert_values: dict = {
        "user_id": payload.user_id,
        "tmdb_movie_id": payload.tmdb_movie_id,
        "status": payload.status or "unseen",
        "skip": payload.skip if payload.skip is not None else False,
    }
    update_values: dict = {"updated_at": func.now()}
    if payload.status is not None:
        update_values["status"] = payload.status
    if payload.skip is not None:
        update_values["skip"] = payload.skip

    await db.execute(
        pg_insert(UserMovieInteraction)
        .values(**insert_values)
        .on_conflict_do_update(constraint="uq_user_movie", set_=update_values)
    )
    await _invalidate_preference_cache(payload.user_id, db)
    await db.commit()
    return {"ok": True}


@app.delete("/interactions/{user_id}/{movie_id}", status_code=204)
async def delete_interaction(user_id: str, movie_id: int, db: AsyncSession = Depends(get_db)):
    """Remove a movie from a user's history so it can be recommended again."""
    await db.execute(
        delete(UserMovieInteraction).where(
            UserMovieInteraction.user_id == user_id,
            UserMovieInteraction.tmdb_movie_id == movie_id,
        )
    )
    await _invalidate_preference_cache(user_id, db)
    await db.commit()


@app.get("/users/{user_id}/history", response_model=List[InteractionRecord])
async def user_history(
    user_id: str,
    status: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    """Return all interaction records for a user, optionally filtered by status."""
    q = select(UserMovieInteraction).where(UserMovieInteraction.user_id == user_id)
    if status:
        q = q.where(UserMovieInteraction.status == status)
    rows = (await db.execute(q)).scalars().all()
    return rows


@app.get("/users/{user_id}/preferences", response_model=UserPreferencesResponse)
async def user_preferences(user_id: str, db: AsyncSession = Depends(get_db)):
    """Return scored genre and decade preferences built from swipe history."""
    genre_scores, decade_scores, liked_count, total_interactions = \
        await _get_preference_scores(user_id, db)

    genres_data = await get_genres()
    id_to_name: dict[int, str] = {g["id"]: g["name"] for g in genres_data.get("genres", [])}

    top_genres = sorted(
        [
            GenreScore(genre_id=gid, genre_name=id_to_name.get(gid, "Unknown"), score=score)
            for gid, score in genre_scores.items()
            if score > 0
        ],
        key=lambda x: x.score,
        reverse=True,
    )[:10]

    top_decades = sorted(
        [DecadeScore(decade=d, score=s) for d, s in decade_scores.items() if s > 0],
        key=lambda x: x.score,
        reverse=True,
    )[:5]

    return UserPreferencesResponse(
        user_id=user_id,
        top_genres=top_genres,
        top_decades=top_decades,
        liked_count=liked_count,
        total_interactions=total_interactions,
    )


@app.post("/for-you", response_model=RandomMovieResponse)
async def for_you(req: ForYouRequest, db: AsyncSession = Depends(get_db)):
    """Return a preference-matched movie, ignoring the user's active filters."""
    genre_scores, decade_scores, liked_count, _ = \
        await _get_preference_scores(req.user_id, db)

    # Not enough signal yet — tell the frontend to fall back
    if liked_count < 5:
        from fastapi.responses import JSONResponse
        return JSONResponse(status_code=202, content={"enough_data": False})

    top_genre_id: int | None = max(genre_scores, key=lambda g: genre_scores[g], default=None) \
        if genre_scores else None
    top_decade: int | None = max(decade_scores, key=lambda d: decade_scores[d], default=None) \
        if decade_scores else None

    discover_params: dict = {
        "include_adult": "false",
        "include_video": "false",
        "sort_by": "vote_average.desc",
        "vote_count.gte": "100",
        "page": 1,
    }
    if top_genre_id:
        discover_params["with_genres"] = str(top_genre_id)
    if top_decade:
        discover_params["primary_release_date.gte"] = f"{top_decade}-01-01"
        discover_params["primary_release_date.lte"] = f"{top_decade + 9}-12-31"

    first = await discover_movies(discover_params)
    total_pages = min(int(first.get("total_pages") or 0), 500)
    if total_pages <= 0:
        raise HTTPException(status_code=404, detail="No for-you movies found.")

    region = req.region
    suppress_since = datetime.now(timezone.utc) - timedelta(days=req.suppress_days)

    for _ in range(req.reroll_max):
        page = random.randint(1, total_pages)
        discover_params["page"] = page
        page_data = await discover_movies(discover_params)
        results = page_data.get("results") or []
        if not results:
            continue

        pick = random.choice(results)
        movie_id = pick.get("id")
        if not movie_id:
            continue

        q = select(UserMovieInteraction).where(
            UserMovieInteraction.user_id == req.user_id,
            UserMovieInteraction.tmdb_movie_id == int(movie_id),
        )
        row = (await db.execute(q)).scalar_one_or_none()
        if row:
            if row.skip or row.status in ("watched", "liked"):
                continue
            if row.last_surfaced_at and row.last_surfaced_at >= suppress_since:
                continue

        details, videos_json, providers_json = await asyncio.gather(
            get_movie(int(movie_id)),
            get_movie_videos(int(movie_id)),
            get_watch_providers(int(movie_id)),
        )
        trailer_url = extract_trailer_url(videos_json)
        where_to_watch = extract_providers(providers_json, region)

        raw_genre_ids: list[int] = pick.get("genre_ids") or []
        raw_release_date: str = pick.get("release_date") or ""
        raw_release_year: int | None = int(raw_release_date[:4]) if len(raw_release_date) >= 4 else None

        now = datetime.now(timezone.utc)
        if row:
            row.last_surfaced_at = now
            if not row.genre_ids and raw_genre_ids:
                row.genre_ids = raw_genre_ids
            if not row.release_year and raw_release_year:
                row.release_year = raw_release_year
        else:
            db.add(UserMovieInteraction(
                user_id=req.user_id,
                tmdb_movie_id=int(movie_id),
                status="unseen",
                skip=False,
                last_surfaced_at=now,
                genre_ids=raw_genre_ids or None,
                release_year=raw_release_year,
            ))
        await db.commit()

        return RandomMovieResponse(
            id=int(details["id"]),
            title=details.get("title") or "Unknown title",
            overview=details.get("overview"),
            poster_url=poster_url(details.get("poster_path")),
            runtime=details.get("runtime"),
            release_year=raw_release_year,
            trailer_url=trailer_url,
            where_to_watch=where_to_watch,
            content_rating=None,
            is_for_you=True,
            genre_ids=raw_genre_ids or None,
        )

    raise HTTPException(status_code=404, detail="Could not find a for-you movie after rerolls.")
