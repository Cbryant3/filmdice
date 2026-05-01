from fastapi import FastAPI, HTTPException, Depends
from app import db
from app.tmdb_client import get_movie, poster_url
from app.config import settings
import random
from app.schemas import RandomMovieRequest, RandomMovieResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timedelta, timezone
from app.db import Base, engine, get_db
from app.models import UserMovieInteraction
from app.schemas import InteractionUpsert, RandomMovieRequest, RandomMovieResponse
from app.tmdb_client import (
    discover_movies, get_movie, poster_url, get_movie_videos, get_watch_providers, get_release_dates, get_release_dates
)

app = FastAPI(title="Random Movie API", version="0.0.1")
@app.get("/")

def extract_trailer_url(videos_json: dict) -> str | None:
    results = videos_json.get("results") or []
    # Prefer YouTube Trailer
    for v in results:
        if v.get("site") == "YouTube" and v.get("type") == "Trailer" and v.get("key"):
            return f"https://www.youtube.com/watch?v={v['key']}"
    # Fallback: any YouTube video
    for v in results:
        if v.get("site") == "YouTube" and v.get("key"):
            return f"https://www.youtube.com/watch?v={v['key']}"
    return None

def extract_certification(release_dates_json: dict, region: str) -> str | None:
    results = release_dates_json.get("results") or []
    for block in results:
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

def root():
    return {"message": "API is running. Go to /docs"}

@app.on_event("startup")
async def startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


@app.get("/debug-key")
def debug_key():
    return {"has_key": bool(settings.tmdb_api_key), "len": len(settings.tmdb_api_key)}


@app.get("/health")
def health():
    return {"ok": True}


@app.get("/tmdb-test")
async def tmdb_test():
    data = await get_movie(603)  # The Matrix
    return {
        "id": data["id"],
        "title": data.get("title"),
        "overview": data.get("overview"),
        "poster_url": poster_url(data.get("poster_path")),
    }

@app.post("/random-movie", response_model=RandomMovieResponse)
async def random_movie(req: RandomMovieRequest, db: AsyncSession = Depends(get_db)):

    # 1) Build discover params from filters
    f = req.filters
    discover_params = {
        "include_adult": "false",
        "include_video": "false",
        "sort_by": f.sort_by or "popularity.desc",
        "page": 1,
    }

    if f.region:
        discover_params["region"] = f.region
    if f.genre_ids:
        discover_params["with_genres"] = ",".join(map(str, f.genre_ids))
    if f.year_min:
        discover_params["primary_release_date.gte"] = f"{f.year_min}-01-01"
    if f.year_max:
        discover_params["primary_release_date.lte"] = f"{f.year_max}-12-31"
    if f.rating_min is not None:
        discover_params["vote_average.gte"] = str(f.rating_min)
    if f.vote_count_min is not None:
        discover_params["vote_count.gte"] = str(f.vote_count_min)
    if f.language:
        discover_params["with_original_language"] = f.language

    # Exclude genres
    if f.exclude_genre_ids:
        discover_params["without_genres"] = ",".join(map(str, f.exclude_genre_ids))

    # Decade shortcut (only if year_min/year_max not set)
    if f.decade and not f.year_min and not f.year_max:
        discover_params["primary_release_date.gte"] = f"{f.decade}-01-01"
        discover_params["primary_release_date.lte"] = f"{f.decade + 9}-12-31"

    # Runtime filter
    if f.runtime_min is not None:
        discover_params["with_runtime.gte"] = str(f.runtime_min)
    if f.runtime_max is not None:
        discover_params["with_runtime.lte"] = str(f.runtime_max)

    # 2) First discover call to learn total_pages
    first = await discover_movies(discover_params)
    total_pages = int(first.get("total_pages") or 0)
    if total_pages <= 0:
        raise HTTPException(status_code=404, detail="No movies found for those filters.")

    # TMDb caps discover at 500 pages
    total_pages = min(total_pages, 500)

    # Precompute these once
    suppress_since = datetime.now(timezone.utc) - timedelta(days=req.suppress_days)
    region = f.region or "US"
    rating_region = f.content_rating_region or region

    # 3) Try up to reroll_max to get a valid pick
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

        # --- DB check FIRST: skip/watched/recent suppression ---
        q = select(UserMovieInteraction).where(
            UserMovieInteraction.user_id == req.user_id,
            UserMovieInteraction.tmdb_movie_id == int(movie_id),
        )
        row = (await db.execute(q)).scalar_one_or_none()

        if row:
            if row.skip:
                continue
            if row.status == "watched":
                continue
            if row.last_surfaced_at and row.last_surfaced_at >= suppress_since:
                continue

        # --- TMDb calls AFTER passing DB checks ---
        details = await get_movie(int(movie_id))

        # Trailer
        videos_json = await get_movie_videos(int(movie_id))
        trailer_url = extract_trailer_url(videos_json)

        # Where to watch
        providers_json = await get_watch_providers(int(movie_id))
        where_to_watch = extract_providers(providers_json, region)

        if f.must_be_streaming and not where_to_watch["flatrate"]:
            continue  # reroll

        # Content rating include/exclude
        cert = None
        if f.content_rating_include or f.content_rating_exclude:
            release_dates_json = await get_release_dates(int(movie_id))
            cert = extract_certification(release_dates_json, rating_region)

            if f.content_rating_include and (cert not in f.content_rating_include):
                continue
            if f.content_rating_exclude and cert in f.content_rating_exclude:
                continue

        # --- Mark as surfaced (required for suppression to work) ---
        now = datetime.now(timezone.utc)
        if row:
            row.last_surfaced_at = now
        else:
            db.add(UserMovieInteraction(
                user_id=req.user_id,
                tmdb_movie_id=int(movie_id),
                status="unseen",
                skip=False,
                last_surfaced_at=now,
            ))
        await db.commit()

        # Return final response
        return RandomMovieResponse(
            id=int(details["id"]),
            title=details.get("title") or "Unknown title",
            overview=details.get("overview"),
            poster_url=poster_url(details.get("poster_path")),
            runtime=details.get("runtime"),
            trailer_url=trailer_url,
            where_to_watch=where_to_watch,
            content_rating=cert,
        )

    raise HTTPException(status_code=404, detail="Could not find a movie after rerolls.")

@app.post("/interactions")
async def upsert_interaction(payload: InteractionUpsert, db: AsyncSession = Depends(get_db)):
    q = select(UserMovieInteraction).where(
        UserMovieInteraction.user_id == payload.user_id,
        UserMovieInteraction.tmdb_movie_id == payload.tmdb_movie_id,
    )
    row = (await db.execute(q)).scalar_one_or_none()

    if row is None:
        row = UserMovieInteraction(
            user_id=payload.user_id,
            tmdb_movie_id=payload.tmdb_movie_id,
            status="unseen",
            skip=False,
        )
        db.add(row)

    if payload.status is not None:
        if payload.status not in {"unseen", "watched", "dropped"}:
            raise HTTPException(400, 'status must be "unseen", "watched", or "dropped"')
        row.status = payload.status

    if payload.skip is not None:
        row.skip = payload.skip

    await db.commit()
    return {"ok": True}