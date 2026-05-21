# FilmDice 🎲

A Tinder-style movie discovery app. Swipe right to like, left to skip. The more you swipe, the smarter it gets — FilmDice learns your taste and injects a personalized **⭐ For You** recommendation every 10 cards.

Built with a FastAPI backend and a Next.js frontend, backed by The Movie Database (TMDB) API.

---

## Features

### Swipe Interface
- Drag cards left/right on mobile or use keyboard-style buttons
- **LIKE / NOPE** stamps animate as you drag
- Dice-roll loading animation with procedural Web Audio sound between cards

### Smart Recommendations
- **"For You" cards** — every 10th swipe surfaces a movie matched to your learned preferences
- Preference engine tallies genres and decades from likes/skips (liked = +3, watched = +1, dropped = −1, skipped = −0.5)
- Falls back to a regular random pick if not enough history exists yet

### Rich Movie Cards
- Poster, title, release year, runtime, content rating
- Full overview (desktop)
- YouTube trailer modal
- Streaming providers (subscription / rent / buy) with JustWatch deep links
- **⭐ For You** badge on personalized picks

### Filter Panel
| Filter | Options |
|---|---|
| Sort | Popularity · Highest Rated · Newest First |
| Region | 51 countries across all continents, or Any Region |
| Genres | All TMDB genres (multi-select pills) |
| Decade | 1960s – 2020s (multi-select, spans across gaps) |
| Rating | Dual-handle slider 0 – 10 |
| Content Rating | G · PG · PG-13 · R · NC-17 |
| Max Runtime | Any · 90m · 120m · 150m · 180m |
| Streaming Only | Toggle — only shows movies on a subscription service |

### Backend
- Reroll loop skips movies you've already seen, liked, or were shown recently
- Concurrent TMDB calls (details + trailer + providers fetched in parallel)
- Genre and release-year data saved on every interaction for preference learning
- Suppression window prevents the same movie surfacing twice within N days

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 (App Router), Tailwind CSS v4, TypeScript |
| Backend | FastAPI, Python 3.13 |
| Database | PostgreSQL (Docker), SQLAlchemy async, asyncpg |
| HTTP Client | httpx (shared async client) |
| External API | The Movie Database (TMDB) v3/v4 |
| Containerization | Docker Compose |

---

## Project Structure

```
FilmDice/
├── movie-randomizer-backend/   # FastAPI API
│   ├── app/
│   │   ├── main.py             # Routes
│   │   ├── schemas.py          # Pydantic models
│   │   ├── models.py           # SQLAlchemy ORM
│   │   ├── services.py         # Preference scoring logic
│   │   ├── tmdb_client.py      # TMDB API client
│   │   ├── db.py               # Async DB session
│   │   ├── config.py           # Environment config
│   │   └── cache.py            # In-memory cache
│   ├── docker-compose.yml
│   └── requirements.txt
│
└── movie-randomizer-frontend/  # Next.js app
    ├── app/
    │   ├── page.tsx            # Discover page (swipe UI)
    │   └── watchlist/          # Liked movies list
    ├── components/
    │   ├── MovieCard.tsx       # Swipeable card
    │   ├── FilterPanel.tsx     # Slide-out filter drawer
    │   ├── DiceLoader.tsx      # Loading animation
    │   ├── RangeSlider.tsx     # Dual-handle slider
    │   └── TrailerModal.tsx    # YouTube embed modal
    ├── hooks/
    │   └── useSwipe.ts         # Pointer-events swipe hook
    └── lib/
        ├── api.ts              # API functions
        ├── types.ts            # Shared TypeScript types
        └── userId.ts           # Anonymous user ID (localStorage)
```

---

## Getting Started

### Prerequisites
- Python 3.11+
- Node.js 18+
- Docker Desktop

### 1. Clone

```bash
git clone https://github.com/cbryant3/filmdice.git
cd filmdice
```

### 2. Backend setup

```bash
cd movie-randomizer-backend
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # macOS/Linux
pip install -r requirements.txt
```

Create `.env` in `movie-randomizer-backend/`:

```env
TMDB_API_KEY=your_tmdb_api_key_here
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/moviedb
```

Start the database and API:

```bash
docker compose up -d
uvicorn app.main:app --reload
```

API docs available at `http://localhost:8000/docs`

### 3. Frontend setup

```bash
cd movie-randomizer-frontend
npm install
npm run dev
```

App available at `http://localhost:3000`

---

## API Overview

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/random-movie` | Get a filtered random movie |
| `POST` | `/for-you` | Get a preference-matched movie |
| `POST` | `/interactions` | Record a like / skip / watch |
| `DELETE` | `/interactions/{user_id}/{movie_id}` | Remove from history |
| `GET` | `/users/{user_id}/history` | Interaction history |
| `GET` | `/users/{user_id}/preferences` | Learned genre/decade scores |
| `GET` | `/genres` | All TMDB genre IDs and names |
| `GET` | `/movies/{id}` | Full metadata for a single movie |

---

## Author

**Cameron Bryant** — Chicago-based developer building real-world full-stack applications.
