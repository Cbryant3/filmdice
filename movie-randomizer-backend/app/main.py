from fastapi import FastAPI, HTTPException
from app.tmdb_client import get_movie, poster_url
from app.config import settings
import random
from app.schemas import RandomMovieRequest, RandomMovieResponse
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
async def random_movie(req: RandomMovieRequest):
    # 1) Build discover params from filters
    f = req.filters
    discover_params = {
        "include_adult": "false",
        "include_video": "false",
        "sort_by": "popularity.desc",
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

    # decade shortcut (only if year_min/year_max not set)
    if f.decade and not f.year_min and not f.year_max:
        discover_params["primary_release_date.gte"] = f"{f.decade}-01-01"
        discover_params["primary_release_date.lte"] = f"{f.decade + 9}-12-31"

    # runtime filter
    if f.runtime_min is not None:
        discover_params["with_runtime.gte"] = str(f.runtime_min)
    if f.runtime_max is not None:
        discover_params["with_runtime.lte"] = str(f.runtime_max)

    # exclude genres
    if f.exclude_genre_ids:
        discover_params["without_genres"] = ",".join(map(str, f.exclude_genre_ids))

    # 2) First discover call to learn total_pages
    first = await discover_movies(discover_params)
    total_pages = int(first.get("total_pages") or 0)
    if total_pages <= 0:
        raise HTTPException(status_code=404, detail="No movies found for those filters.")

    # TMDb commonly caps discover at 500 pages
    total_pages = min(total_pages, 500)

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
        # Get trailer URL
        videos_json = await get_movie_videos(int(movie_id))
        trailer_url = extract_trailer_url(videos_json)

        # Get watch providers
        region = f.region or "US"
        providers_json = await get_watch_providers(int(movie_id))
        where_to_watch = extract_providers(providers_json, region)

        # If user wants ONLY streamable movies
        if f.must_be_streaming:
            if not where_to_watch["flatrate"]:
                continue  # reroll

        rating_region = f.content_rating_region or region
        cert = None

        # Only call release_dates if user asked for rating filtering OR you want to display it
        if f.content_rating_include or f.content_rating_exclude:
            release_dates_json = await get_release_dates(int(movie_id))
            cert = extract_certification(release_dates_json, rating_region)

            if f.content_rating_include and (cert not in f.content_rating_include):
                continue
            if f.content_rating_exclude and cert in f.content_rating_exclude:
                continue

        # 4) Fetch details for full overview/poster (discover has some but details is consistent)
        details = await get_movie(int(movie_id))
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