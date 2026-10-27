# FilmDice - Backend API

FastAPI backend for FilmDice, a Tinder-style movie discovery app. Wraps the TMDB Discover API with filtering, reroll logic, user interaction tracking, and a preference learning engine.

## Tech Stack

- **FastAPI** — async Python web framework
- **PostgreSQL** — interaction history and preference data
- **SQLAlchemy** (async) + **asyncpg** — ORM and DB driver
- **httpx** — shared async HTTP client for TMDB calls
- **Docker Compose** — local PostgreSQL instance

## Setup

### 1. Install dependencies

```bash
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # macOS/Linux
pip install -r requirements.txt
```

### 2. Configure environment

Create `.env` in this directory:

```env
TMDB_API_KEY=your_tmdb_api_key_here
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/moviedb
TMDB_AUTH_MODE=v3
```

### 3. Start the database

```bash
docker compose up -d
```

> To reset all data (required after model changes): `docker compose down -v && docker compose up -d`

### 4. Run the API

```bash
python -m uvicorn app.main:app --reload
```

API docs: `http://localhost:8000/docs`

---

## API Reference

### `POST /random-movie`
Returns a random movie matching the given filters, skipping movies the user has already seen or liked.

```json
{
  "user_id": "abc123",
  "filters": {
    "genre_ids": [27],
    "decades": [1990, 2000],
    "rating_min": 6.5,
    "region": "US",
    "must_be_streaming": true,
    "content_rating_include": ["PG-13", "R"]
  },
  "reroll_max": 10,
  "suppress_days": 30
}
```

### `POST /for-you`
Returns a preference-matched movie ignoring active filters. Returns HTTP 202 if the user has fewer than 5 likes (not enough data).

```json
{ "user_id": "abc123", "reroll_max": 10 }
```

### `POST /interactions`
Record a like, watch, skip, or drop.

```json
{
  "user_id": "abc123",
  "tmdb_movie_id": 550,
  "status": "liked"
}
```

### `GET /users/{user_id}/preferences`
Returns scored genre and decade preferences derived from the user's interaction history.

### `GET /users/{user_id}/history`
Returns all interaction records. Add `?status=liked` to filter.

### `DELETE /interactions/{user_id}/{movie_id}`
Removes a movie from history so it can be recommended again.

### `POST /interactions/undo`
Undoes a swipe: the movie goes back to "shown, not swiped" and today's anonymous counters are corrected. Body: `user_id`, `tmdb_movie_id`, `kind` (`like` | `skip` | `watched`), optional `context`.

### `DELETE /users/{user_id}`
Deletes all swipe history and the taste profile for that user ("Delete my data"). Users inactive for 365 days are also purged automatically by a daily background job.

### `GET /stats`
Public, anonymous usage and health numbers for the frontend's `/stats` page (cached for 60 s). Daily counters live in the `daily_metrics` table and hold no user IDs.

### `POST /events`
Anonymous engagement counters reported by the frontend: `trailer_play`, `watch_link`.

### `GET /health`
Health check (also used by the frontend to wait for a cold start).

### `GET /genres`
Returns all TMDB genre IDs and names.

### `GET /movies/{id}`
Returns full TMDB metadata for a single movie (used by the watchlist page).

---

## Preference Learning

Every time a movie is surfaced, its `genre_ids` and `release_year` are saved to the interaction row. The scoring function (`services.py`) tallies these into genre and decade scores:

| Interaction | Weight |
|---|---|
| Liked | +3.0 |
| Watched | +1.0 |
| Dropped | -1.0 |
| Skipped | -0.5 |

`/for-you` picks the top-scoring genre and decade and builds a targeted Discover query.

Scores are cached in the `user_preference_cache` table (one row per user) and invalidated on every interaction write or delete, so reads are fast and scores are always fresh.

---

## Project Structure

```
app/
├── main.py          # Routes, middleware, inactive-user cleanup job
├── metrics.py       # Anonymous daily counters, health numbers, /stats
├── ratelimit.py     # Per-visitor in-memory rate limits
├── schemas.py       # Pydantic request/response models
├── models.py        # SQLAlchemy ORM models (UserMovieInteraction, UserPreferenceCache)
├── services.py      # Preference scoring
├── tmdb_client.py   # TMDB API client (shared httpx client)
├── db.py            # Async DB session factory
└── config.py        # Settings from .env
```

---

## Security

- CORS allows the live site, its Vercel previews and localhost by default (override with `ALLOWED_ORIGINS`).
- Per-visitor rate limits: data deletion 10/hour, rolls 90/min, interactions 120/min, events 60/min, stats 30/min, 300/min overall. Over the limit returns 429 with `Retry-After`.

## Testing

48 pytest tests in `tests/` run against a real PostgreSQL database with TMDB replaced by a fake:

```bash
pip install -r requirements-dev.txt
TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/filmdice_test python -m pytest
```
