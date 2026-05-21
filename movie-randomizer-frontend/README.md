# FilmDice — Frontend

Next.js frontend for FilmDice. Swipe right to like a movie, left to skip. Filters let you narrow by genre, decade, region, rating, content rating, runtime, and streaming availability.

## Tech Stack

- **Next.js 15** — App Router, React 19
- **Tailwind CSS v4** — utility-first styling
- **TypeScript**
- Custom pointer-events swipe hook (no external swipe library)
- Web Audio API for procedural dice-roll sound

## Setup

```bash
npm install
npm run dev
```

App runs at `http://localhost:3000`. Requires the backend running at `http://localhost:8000`.

To point at a different backend, set `NEXT_PUBLIC_API_URL` in `.env.local`:

```env
NEXT_PUBLIC_API_URL=https://your-api.example.com
```

---

## Key Components

### `components/MovieCard.tsx`
Swipeable card showing poster, title, release year, runtime, content rating, streaming providers, and a trailer button. Desktop layout shows a full details panel alongside the poster. Shows an **⭐ For You** badge when the card is a personalized recommendation.

### `components/FilterPanel.tsx`
Slide-out drawer with:
- Sort order
- Region (51 countries or Any)
- Genres (multi-select pills from the API)
- Decade (multi-select, 1960s–2020s)
- Rating range (dual-handle slider)
- Content rating (G / PG / PG-13 / R / NC-17)
- Max runtime
- Streaming-only toggle

### `components/DiceLoader.tsx`
SVG dice animation between cards. Rapidly cycles through face values, settles on a result, and plays a procedurally generated dice-roll sound via the Web Audio API.

### `components/RangeSlider.tsx`
Dual-handle range slider built with pointer capture (no library). Used for the rating filter.

### `hooks/useSwipe.ts`
Custom hook using `pointermove` / `pointerup` events and `setPointerCapture`. Returns `style` (transform), `likeIndicator` / `nopeIndicator` (opacity), `handlers`, and a `triggerSwipe` function for the action buttons.

---

## How "For You" Works

Every 10 swipes, the app calls `POST /for-you` instead of the normal random endpoint. The backend uses the user's swipe history to pick a movie that matches their preferred genres and decades, ignoring whatever filters are currently active. If there aren't enough likes yet, it falls back to a normal random pick.
