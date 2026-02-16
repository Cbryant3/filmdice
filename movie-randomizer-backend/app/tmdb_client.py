import httpx
from .config import settings

TMDB_BASE = "https://api.themoviedb.org/3"
IMG_BASE = "https://image.tmdb.org/t/p/w500"

async def get_movie(movie_id: int) -> dict:
    auth_mode = settings.tmdb_auth_mode.lower()
    headers = {"accept": "application/json"}
    params = {}

    if auth_mode == "v4":
        headers["Authorization"] = f"Bearer {settings.tmdb_api_key}"
    elif auth_mode == "v3":
        params["api_key"] = settings.tmdb_api_key
    else:
        raise ValueError("TMDB_AUTH_MODE must be 'v3' or 'v4'")
    
    async with httpx.AsyncClient(timeout=15.0) as client:
        r = await client.get(f"{TMDB_BASE}/movie/{movie_id}", params=params)
        r.raise_for_status()
        return r.json()

async def get_movie_videos(movie_id: int) -> dict:
    params = {"api_key": settings.tmdb_api_key}
    async with httpx.AsyncClient(timeout=15.0) as client:
        r = await client.get(f"{TMDB_BASE}/movie/{movie_id}/videos", params=params)
        r.raise_for_status()
        return r.json()

async def get_watch_providers(movie_id: int) -> dict:
    params = {"api_key": settings.tmdb_api_key}
    async with httpx.AsyncClient(timeout=15.0) as client:
        r = await client.get(f"{TMDB_BASE}/movie/{movie_id}/watch/providers", params=params)
        r.raise_for_status()
        return r.json()

async def get_release_dates(movie_id: int) -> dict:
    params = {"api_key": settings.tmdb_api_key}
    async with httpx.AsyncClient(timeout=15.0) as client:
        r = await client.get(f"{TMDB_BASE}/movie/{movie_id}/release_dates", params=params)
        r.raise_for_status()
        return r.json()
    

async def discover_movies(params: dict) -> dict:
    params = dict(params)  # copy
    params["api_key"] = settings.tmdb_api_key

    async with httpx.AsyncClient(timeout=15.0) as client:
        r = await client.get(f"{TMDB_BASE}/discover/movie", params=params)
        r.raise_for_status()
        return r.json()
    
def poster_url(poster_path: str | None) -> str | None:
    if not poster_path:
        return None
    return f"{IMG_BASE}{poster_path}"

def logo_url(logo_path: str | None) -> str | None:
    if not logo_path:
        return None
    return f"{IMG_BASE}{logo_path}"