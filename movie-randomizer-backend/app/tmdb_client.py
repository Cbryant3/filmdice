import httpx
from .config import settings

TMDB_BASE = "https://api.themoviedb.org/3"
IMG_BASE  = "https://image.tmdb.org/t/p/w500"

_client: httpx.AsyncClient | None = None


def _build_client() -> httpx.AsyncClient:
    headers = {"accept": "application/json"}
    params: dict = {}
    if settings.tmdb_auth_mode.lower() == "v4":
        headers["Authorization"] = f"Bearer {settings.tmdb_api_key}"
    else:
        params["api_key"] = settings.tmdb_api_key
    return httpx.AsyncClient(base_url=TMDB_BASE, headers=headers, params=params, timeout=15.0)


async def startup() -> None:
    global _client
    _client = _build_client()


async def shutdown() -> None:
    global _client
    if _client is not None:
        await _client.aclose()
        _client = None


def _http() -> httpx.AsyncClient:
    if _client is None:
        raise RuntimeError("TMDB client not initialized — call tmdb_client.startup() first")
    return _client


async def discover_movies(params: dict) -> dict:
    r = await _http().get("/discover/movie", params=params)
    r.raise_for_status()
    return r.json()


async def get_movie(movie_id: int) -> dict:
    r = await _http().get(f"/movie/{movie_id}")
    r.raise_for_status()
    return r.json()


async def get_movie_videos(movie_id: int) -> dict:
    r = await _http().get(f"/movie/{movie_id}/videos")
    r.raise_for_status()
    return r.json()


async def get_watch_providers(movie_id: int) -> dict:
    r = await _http().get(f"/movie/{movie_id}/watch/providers")
    r.raise_for_status()
    return r.json()


async def get_release_dates(movie_id: int) -> dict:
    r = await _http().get(f"/movie/{movie_id}/release_dates")
    r.raise_for_status()
    return r.json()


async def get_genres() -> dict:
    r = await _http().get("/genre/movie/list")
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
