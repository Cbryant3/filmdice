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
- **"For You" cards** - every 10th swipe surfaces a movie matched to your learned preferences
- Preference engine tallies genres and decades from likes/skips (liked = +3, watched = +1, dropped = -1, skipped = -0.5)
- Falls back to a regular random pick if not enough history exists yet

### Rich Movie Cards
- Poster, title, release year, runtime, content rating
- Full overview (desktop)
- YouTube trailer modal
- Streaming providers (subscription / rent / buy) with JustWatch deep links
- **For You** badge on personalized picks

### Accounts
- Sign in with Google (Auth.js v5) to sync your swipe history across devices
- Anonymous mode uses a localStorage UUID — no sign-in required

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
- Preference scores cached per user in PostgreSQL; invalidated on every interaction write

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 (App Router), Tailwind CSS v4, TypeScript |
| Auth | Auth.js v5 (NextAuth) with Google OAuth |
| Backend | FastAPI, Python 3.13 |
| Database | PostgreSQL (Docker), SQLAlchemy async, asyncpg |
| HTTP Client | httpx (shared async client) |
| External API | The Movie Database (TMDB) v3/v4 |
| Containerization | Docker Compose |

---

## Project Structure

```
FilmDice/
├── start.ps1                   # One-command startup (Windows)
├── stop.ps1                    # Stops all services
├── movie-randomizer-backend/   # FastAPI API
│   ├── app/
│   │   ├── main.py             # Routes
│   │   ├── schemas.py          # Pydantic models
│   │   ├── models.py           # SQLAlchemy ORM
│   │   ├── services.py         # Preference scoring logic
│   │   ├── tmdb_client.py      # TMDB API client
│   │   ├── db.py               # Async DB session
│   │   └── config.py           # Environment config
│   ├── docker-compose.yml
│   └── requirements.txt
│
└── movie-randomizer-frontend/  # Next.js app
    ├── auth.ts                 # Auth.js v5 config (Google OAuth)
    ├── app/
    │   ├── page.tsx            # Discover page (swipe UI)
    │   ├── watchlist/          # Liked movies list
    │   └── api/auth/           # Auth.js route handler
    ├── components/
    │   ├── MovieCard.tsx       # Swipeable card
    │   ├── FilterPanel.tsx     # Slide-out filter drawer
    │   ├── DiceLoader.tsx      # Loading animation
    │   ├── RangeSlider.tsx     # Dual-handle slider
    │   ├── TrailerModal.tsx    # YouTube embed modal
    │   ├── Navbar.tsx          # Sign in/out + navigation
    │   ├── Providers.tsx       # SessionProvider wrapper
    │   └── ErrorBoundary.tsx   # Top-level error fallback
    ├── hooks/
    │   ├── useSwipe.ts         # Pointer-events swipe hook
    │   └── useUserId.ts        # Session or anonymous user ID
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

### 2. Quick start (Windows)

```powershell
.\start.ps1
```

The script checks prerequisites, creates the Python venv, installs dependencies, starts PostgreSQL via Docker, and opens the backend and frontend in separate terminals.

### 3. Manual setup

**Backend** — create `movie-randomizer-backend/.env`:

```env
TMDB_API_KEY=your_tmdb_api_key_here
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/moviedb
TMDB_AUTH_MODE=v3
```

Then:

```bash
cd movie-randomizer-backend
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # macOS/Linux
pip install -r requirements.txt
docker compose up -d
python -m uvicorn app.main:app --reload
```

API docs: `http://localhost:8000/docs`

**Frontend** — create `movie-randomizer-frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
AUTH_SECRET=your_random_secret_here
AUTH_GOOGLE_ID=your_google_client_id
AUTH_GOOGLE_SECRET=your_google_client_secret
```

Get Google credentials at [console.cloud.google.com](https://console.cloud.google.com/apis/credentials) — add `http://localhost:3000/api/auth/callback/google` as an authorized redirect URI.

```bash
cd movie-randomizer-frontend
npm install
npm run dev
```

App: `http://localhost:3000`

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
