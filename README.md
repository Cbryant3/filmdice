# FilmDice

[![CI](https://github.com/Cbryant3/filmdice/actions/workflows/ci.yml/badge.svg)](https://github.com/Cbryant3/filmdice/actions/workflows/ci.yml)

**Live app: [filmdice-bay.vercel.app](https://filmdice-bay.vercel.app)** · **Live usage stats: [/stats](https://filmdice-bay.vercel.app/stats)**

A swipe-based movie discovery app. FilmDice "rolls the dice" and shows one movie at a time: swipe right to like it, left to skip, up if you've already seen it. The more you swipe, the better it knows your taste, and every 10th card is a **For You** pick matched to what you like.

Built with a Next.js frontend on Vercel, a FastAPI backend and PostgreSQL database on Render, and movie data from [The Movie Database (TMDB)](https://www.themoviedb.org). Installable on your phone's home screen.

---

## Features

### Discover
- Swipe cards left / right / up on a phone, or use the buttons on any screen
- **LIKE / NOPE / SEEN** stamps animate as you drag; tap a card for full details
- **Undo** brings back the last movie (up to 20 in a row), erases that swipe, and keeps the movie you were looking at next in line
- Each card shows poster, year, runtime, content rating, overview, trailer, and where to stream, rent or buy it
- The next movie is fetched in the background, so most swipes are instant

### Filters
Filters apply from your **next roll** (the movie on screen stays put) and stay on until you change them, reset them, or close the app.

| Filter | Options |
|---|---|
| Sort | Most Popular · Highest Rated · Newest First |
| Region | 51 countries, or any region |
| Language | 20 original languages, or any |
| Genres | All TMDB genres (multi-select) |
| Decade | 1960s – 2020s (range) |
| Rating | Dual-handle slider, 0 – 10 |
| Content rating | G · PG · PG-13 · R · NC-17 |
| Max runtime | Any · 90 · 120 · 150 · 180 min |
| Streaming only | Only movies on a subscription service |

### Repeat rules

| Swipe | Saved as | When it can come back |
|---|---|---|
| Right | Liked | Never (it's in your Liked list) |
| Up | Watched | After 90 days |
| Left | Skipped | After 30 days |

### For You
After 5 likes, every 10th card is picked for you. A scoring engine tallies the genres and decades of everything you swipe (liked +3, watched +1, skipped −0.5) and searches for well-rated films in your top genre and decade. The public stats page compares how often For You picks get liked versus random ones.

### Liked and Watched
- Separate tabs with counts
- Tap any movie (or **Details**) for its overview, trailer and where to watch
- Remove movies individually

### Accounts and privacy
- **No sign-in needed:** history is tied to a random ID stored in your browser
- **Sign in with Google** to sync across devices; the database stores only your Google account ID, never your name, email or photo
- **Delete my data** button erases your history and taste profile instantly
- Data is deleted automatically after **one year** of inactivity
- No ads, no third-party analytics; trailers use YouTube's privacy-enhanced player

### Public stats page
Anonymous, live numbers at [/stats](https://filmdice-bay.vercel.app/stats): users and activity, swipe totals, 30-day trends, For You vs. random like rate, most-liked genres and movies (a movie only appears once 2+ people like it), filter usage, and server health (response times, error rate, uptime). Daily counters store no user IDs.

### Info pages
FAQ, Privacy Policy, an About page with the developer's resume, credits, and contact links, all under the **Info** tab.

### Reliability and security
- **Cold starts:** if the server is asleep, the app waits up to 90 s for it to wake, and shows "Waking up the server…" after 5 s instead of an error
- **CORS** only allows the live site, its Vercel previews and localhost
- **Rate limits** per visitor (rolls, swipes, events, data deletion), with a friendly "slow down" screen
- Friendly error screens with **Try Again**; no debug endpoints in production

---

## How it fits together

```mermaid
flowchart LR
    U[Phone or desktop browser] -->|pages| V[Next.js app<br/>Vercel]
    U -->|API calls| R[FastAPI backend<br/>Render]
    V -->|Google sign-in| G[Google OAuth]
    R --> D[(PostgreSQL<br/>swipes, taste profiles,<br/>anonymous daily stats)]
    R -->|movie data| T[TMDB API]
    U -->|trailers| Y[YouTube<br/>privacy-enhanced]
```

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4 |
| Auth | Auth.js v5 with Google OAuth |
| Backend | FastAPI, Python 3.13, httpx, Pydantic |
| Database | PostgreSQL, SQLAlchemy (async) + asyncpg |
| Data | TMDB API; streaming availability from JustWatch via TMDB |
| Hosting | Vercel (frontend), Render (backend + database) |
| Testing | pytest, Playwright, GitHub Actions |

---

## Project structure

```
filmdice/
├── .github/workflows/ci.yml       # Tests on every push
├── movie-randomizer-backend/      # FastAPI API
│   ├── app/
│   │   ├── main.py                # Routes, cleanup job, middleware
│   │   ├── metrics.py             # Anonymous counters, health, /stats
│   │   ├── ratelimit.py           # Per-visitor rate limits
│   │   ├── services.py            # Taste scoring
│   │   ├── tmdb_client.py         # TMDB client
│   │   ├── models.py, schemas.py  # Database tables, request/response shapes
│   │   ├── db.py, config.py       # Database session, settings
│   ├── tests/                     # pytest suite
│   ├── Procfile                   # Render start command
│   └── docker-compose.yml         # Local PostgreSQL
│
├── movie-randomizer-frontend/     # Next.js app
│   ├── app/
│   │   ├── page.tsx               # Discover (swipe, undo, filters)
│   │   ├── watchlist/             # Liked + Watched
│   │   ├── stats/                 # Public stats page
│   │   ├── faq/, privacy/, about/ # Info pages
│   │   └── api/auth/              # Auth.js route
│   ├── components/                # MovieCard, FilterPanel, StatsDashboard, …
│   ├── hooks/useSwipe.ts          # Drag-to-swipe gesture
│   ├── lib/                       # API client, types, site + resume content
│   ├── e2e/                       # Playwright browser tests
│   └── public/                    # PWA manifest, icon, resume PDF
│
└── start.ps1, stop.ps1            # One-command local start/stop (Windows)
```

---

## Running locally

### Prerequisites
- Python 3.13
- Node.js 22
- Docker Desktop (for the local database)
- A free [TMDB API key](https://www.themoviedb.org/settings/api)

### Quick start (Windows)

```powershell
git clone https://github.com/Cbryant3/filmdice.git
cd filmdice
.\start.ps1            # add -Network to open it on your phone over Wi-Fi
```

The script checks prerequisites, sets up Python, starts PostgreSQL in Docker, and opens the backend and frontend.

### Manual setup

**Backend:** create `movie-randomizer-backend/.env` (see `.env.example`):

```env
TMDB_API_KEY=your_tmdb_key
TMDB_AUTH_MODE=v3          # v3 for an API key, v4 (default) for a read access token
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/moviedb
```

```bash
cd movie-randomizer-backend
python -m venv .venv
.venv\Scripts\activate          # Windows  (macOS/Linux: source .venv/bin/activate)
pip install -r requirements.txt
docker compose up -d
python -m uvicorn app.main:app --reload
```

API docs: http://localhost:8000/docs

**Frontend:** create `movie-randomizer-frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
AUTH_SECRET=any_long_random_string
AUTH_GOOGLE_ID=your_google_client_id          # optional, for sign-in
AUTH_GOOGLE_SECRET=your_google_client_secret
```

For Google sign-in, add `http://localhost:3000/api/auth/callback/google` as a redirect URI in the [Google Cloud console](https://console.cloud.google.com/apis/credentials).

```bash
cd movie-randomizer-frontend
cp next.config.example.ts next.config.ts
npm install
npm run dev
```

App: http://localhost:3000

---

## Deployment

| Piece | Host | Settings |
|---|---|---|
| Frontend | Vercel, root `movie-randomizer-frontend` | `NEXT_PUBLIC_API_URL` (backend URL), `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` |
| Backend | Render web service, root `movie-randomizer-backend`, started by the `Procfile` | `TMDB_API_KEY`, `TMDB_AUTH_MODE`, `DATABASE_URL` (Render's Postgres URL works as-is) |
| Database | Render PostgreSQL | Tables are created automatically on startup |

Pushing to `main` deploys the frontend automatically; every branch gets a Vercel preview link. CORS already allows the live site and its previews; set `ALLOWED_ORIGINS` on Render only to change that.

---

## API

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/random-movie` | A random movie matching the filters |
| `POST` | `/for-you` | A movie matched to the user's taste (202 if fewer than 5 likes) |
| `POST` | `/interactions` | Record a like, skip or watched |
| `POST` | `/interactions/undo` | Undo a swipe |
| `DELETE` | `/interactions/{user_id}/{movie_id}` | Remove a movie from a list |
| `GET` | `/users/{user_id}/history` | Swipe history (`?status=liked` or `watched`) |
| `GET` | `/users/{user_id}/preferences` | Learned genre and decade scores |
| `DELETE` | `/users/{user_id}` | Delete all of a user's data |
| `GET` | `/movies/{id}` | Full details for one movie |
| `GET` | `/genres` | TMDB genre list |
| `GET` | `/stats` | Public anonymous stats |
| `POST` | `/events` | Anonymous counters (trailer plays, watch-link taps) |
| `GET` | `/health` | Health check |

---

## Testing

Every push and pull request runs the full suite on GitHub Actions.

| Suite | What it covers | Size |
|---|---|---|
| Backend (`movie-randomizer-backend/tests`, pytest) | Rolling and filters, repeat rules, swipes and lists, undo, For You, Delete my data, one-year cleanup, stats, CORS, rate limits. Runs against a real PostgreSQL database with TMDB faked. | 48 tests |
| Frontend (`movie-randomizer-frontend/e2e`, Playwright) | Swiping and drag, undo, filters, cold-start / error / rate-limit screens, Liked and Watched details, info pages, Delete my data, stats page, no sideways scrolling. Runs a production build with the backend mocked. | 39 tests × phone and desktop |
| Static checks | TypeScript typecheck, ESLint, production build | Whole frontend |

```bash
# Backend (needs a local PostgreSQL database named filmdice_test)
cd movie-randomizer-backend
pip install -r requirements-dev.txt
TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/filmdice_test python -m pytest

# Frontend
cd movie-randomizer-frontend
npm run typecheck && npm run lint
npx playwright install chromium
npm run test:e2e
```

---

## Credits

- Movie data and images from [The Movie Database (TMDB)](https://www.themoviedb.org). *This product uses the TMDB API but is not endorsed or certified by TMDB.*
- Streaming availability from [JustWatch](https://www.justwatch.com) via TMDB.
- Built with [Claude](https://www.anthropic.com/claude) (Anthropic) as an AI development partner, including Claude Code. FilmDice isn't affiliated with or endorsed by Anthropic.

## Author

**Cameron Bryant** · Chicago, IL
[cameron.bryant823@gmail.com](mailto:cameron.bryant823@gmail.com) · [LinkedIn](https://www.linkedin.com/in/cameron-g-bryant/) · [GitHub](https://github.com/Cbryant3) · [About & resume](https://filmdice-bay.vercel.app/about)
