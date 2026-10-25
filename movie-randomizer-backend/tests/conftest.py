"""
Shared test setup.

* Talks to a real PostgreSQL database (the app relies on Postgres features).
  Set TEST_DATABASE_URL, or it defaults to a local "filmdice_test" database.
* TMDB is replaced by an in-memory fake, so tests are fast, free, and offline.
* Every test starts with empty tables, cleared rate limits, and a cold stats cache.
"""
from __future__ import annotations

import os

os.environ.setdefault("TMDB_API_KEY", "test-key")
os.environ["DATABASE_URL"] = os.environ.get(
    "TEST_DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/filmdice_test"
)
os.environ.pop("ALLOWED_ORIGINS", None)  # exercise the real default

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

import app.main as main
from app import metrics, ratelimit, tmdb_client
from app.db import AsyncSessionLocal

GENRES = {28: "Action", 35: "Comedy", 18: "Drama", 27: "Horror", 878: "Science Fiction"}


class FakeTMDB:
    """Stand-in for the TMDB API. Records every discover query it receives."""

    def __init__(self) -> None:
        self.reset()

    def reset(self, count: int = 60) -> None:
        ids = list(GENRES)
        self.catalog = {
            i: {
                "id": i,
                "title": f"Movie {i}",
                "overview": f"Overview of movie {i}.",
                "poster_path": f"/poster{i}.jpg",
                "runtime": 80 + i,
                "release_date": f"{1980 + (i % 45)}-06-15",
                "genre_ids": [ids[i % len(ids)]],
            }
            for i in range(1, count + 1)
        }
        self.discover_calls: list[dict] = []
        self.calls = 0

    async def discover_movies(self, params: dict) -> dict:
        self.calls += 1
        self.discover_calls.append(dict(params))
        movies = list(self.catalog.values())
        if params.get("with_genres"):
            wanted = {int(g) for g in str(params["with_genres"]).replace(",", "|").split("|")}
            movies = [m for m in movies if wanted & set(m["genre_ids"])]
        if not movies:
            return {"total_pages": 0, "results": []}
        page = int(params.get("page", 1))
        pages = max(1, (len(movies) + 19) // 20)
        chunk = movies[(page - 1) * 20: page * 20] or movies[:20]
        return {"total_pages": pages, "results": chunk}

    async def get_movie(self, movie_id: int) -> dict:
        self.calls += 1
        m = dict(self.catalog.get(movie_id) or {"id": movie_id, "title": f"Movie {movie_id}"})
        m["genres"] = [{"id": g, "name": GENRES.get(g, "?")} for g in m.get("genre_ids", [])]
        return m

    async def get_movie_videos(self, movie_id: int) -> dict:
        return {"results": [{"site": "YouTube", "type": "Trailer", "key": f"trailer{movie_id}"}]}

    async def get_watch_providers(self, movie_id: int) -> dict:
        return {"results": {"US": {
            "link": f"https://www.themoviedb.org/movie/{movie_id}/watch",
            "flatrate": [{"provider_id": 8, "provider_name": "Netflix", "logo_path": "/n.png"}],
            "rent": [], "buy": [],
        }}}

    async def get_release_dates(self, movie_id: int) -> dict:
        return {"results": [{"iso_3166_1": "US", "release_dates": [{"certification": "PG-13"}]}]}

    async def get_genres(self) -> dict:
        return {"genres": [{"id": k, "name": v} for k, v in GENRES.items()]}


FAKE = FakeTMDB()
for _name in ("discover_movies", "get_movie", "get_movie_videos",
              "get_watch_providers", "get_release_dates", "get_genres"):
    setattr(main, _name, getattr(FAKE, _name))
    setattr(tmdb_client, _name, getattr(FAKE, _name))


@pytest.fixture(scope="session")
def _app_client():
    with TestClient(main.app) as c:  # runs startup: creates tables
        yield c


async def _truncate() -> None:
    async with AsyncSessionLocal() as db:
        await db.execute(text(
            "TRUNCATE user_movie_interactions, user_preference_cache, daily_metrics RESTART IDENTITY"
        ))
        await db.commit()


@pytest.fixture
def client(_app_client):
    _app_client.portal.call(_truncate)
    ratelimit.reset()
    metrics._cache = None
    FAKE.reset()
    yield _app_client


@pytest.fixture
def run_sql(_app_client):
    """Run raw SQL on the app's event loop (e.g. to backdate rows)."""
    def _run(sql: str, **params):
        async def go():
            async with AsyncSessionLocal() as db:
                result = await db.execute(text(sql), params)
                await db.commit()
                try:
                    return result.fetchall()
                except Exception:
                    return None
        return _app_client.portal.call(go)
    return _run


@pytest.fixture
def fake_tmdb():
    return FAKE


# ---- helpers used across test files ----

def roll(client, user="user-a", filters=None, **headers):
    return client.post("/random-movie", json={"user_id": user, "filters": filters or {}}, headers=headers or None)


def swipe(client, user, movie_id, kind, context="swipe"):
    body = {"user_id": user, "tmdb_movie_id": movie_id, "context": context}
    if kind == "like":
        body["status"] = "liked"
    elif kind == "watched":
        body["status"] = "watched"
    else:
        body["skip"] = True
    return client.post("/interactions", json=body)


def fresh_stats(client):
    metrics._cache = None
    return client.get("/stats").json()
