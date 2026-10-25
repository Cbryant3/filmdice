/**
 * A fake FilmDice backend for browser tests.
 *
 * The app is built with NEXT_PUBLIC_API_URL=http://api.test, and every request
 * to that host is answered here. Tests can change behavior (slow wake-up,
 * errors, rate limits) and inspect exactly what the app sent.
 */
import { test as base, expect, type BrowserContext, type Page, type Route } from "@playwright/test"

export const API = "http://api.test"

export interface SentRequest {
  method: string
  path: string
  body: Record<string, unknown> | null
}

export interface MovieFixture {
  id: number
  title: string
  overview: string
  runtime: number
  release_year: number
  poster_url: null
  trailer_url: string
  where_to_watch: { region: string; link: string; flatrate: { provider_id: number; provider_name: string; logo_path: null }[]; rent: never[]; buy: never[] }
  content_rating: string
  is_for_you: boolean
  genre_ids: number[]
}

export function makeMovie(id: number, extra: Partial<MovieFixture> = {}): MovieFixture {
  return {
    id,
    title: `Test Movie ${id}`,
    overview: `Overview text for test movie ${id}.`,
    runtime: 100 + id,
    release_year: 2000 + (id % 25),
    poster_url: null,
    trailer_url: `https://www.youtube.com/watch?v=trailer${id}`,
    where_to_watch: {
      region: "US",
      link: "https://www.justwatch.com/us",
      flatrate: [{ provider_id: 8, provider_name: "Netflix", logo_path: null }],
      rent: [],
      buy: [],
    },
    content_rating: "PG-13",
    is_for_you: false,
    genre_ids: [18],
    ...extra,
  }
}

export const STATS = {
  generated_at: "2026-10-24T18:00:00Z",
  tracking_since: "2026-10-24",
  users: { total: 42, signed_in: 10, guests: 32, active_7d: 20, active_30d: 35, returning: 12, avg_swipes_per_user: 18.5 },
  swipes: { movies_served: 900, total: 777, likes: 300, skips: 400, watched: 77, like_rate: 0.386 },
  for_you: { shown: 50, swipes: 40, likes: 26, like_rate: 0.65, random_like_rate: 0.37 },
  engine: { roll_requests: 950, no_results_rate: 0.01, avg_rerolls_per_pick: 1.3 },
  engagement: { undos: 9, trailer_plays: 64, watch_link_taps: 21 },
  filters: { rolls_with_filters_rate: 0.3, usage: [{ filter: "genre", rolls: 120 }, { filter: "decade", rolls: 40 }] },
  taste: {
    top_genres: [{ genre: "Drama", likes: 90 }, { genre: "Comedy", likes: 60 }],
    top_decades: [{ decade: 2010, likes: 100 }],
    top_movies: [{ id: 1, title: "Most Liked Film", year: 2016, poster_url: null, likes: 7 }],
  },
  series: Array.from({ length: 30 }, (_, i) => ({
    day: new Date(Date.UTC(2026, 8, 25 + i)).toISOString().slice(0, 10),
    rolls: 10 + i, swipes: 8 + i, likes: 3, new_users: i % 3,
  })),
  health: {
    up_since: "2026-10-24T12:00:00Z", uptime_seconds: 3600, requests: 500, server_errors: 0,
    error_rate: 0, latency_ms_p50: 42, latency_ms_p95: 180, latency_samples: 500, tmdb_calls: 1200,
  },
}

export class MockApi {
  sent: SentRequest[] = []
  nextId = 1
  /** Delay before /health answers (simulates the server waking up). */
  wakeDelayMs = 0
  /** Force /random-movie to answer with this status instead of a movie. */
  rollStatus: number | null = null
  liked: MovieFixture[] = []
  watched: MovieFixture[] = []
  stats: unknown = STATS
  statsStatus = 200

  constructor(private context: BrowserContext) {}

  async install() {
    await this.context.route(`${API}/**`, async route => {
      try {
        await this.handle(route)
      } catch {
        // The page closed while this request was in flight (e.g. a tracking
        // ping sent as a test ended). Nothing to answer.
      }
    })
  }

  async uninstall() {
    await this.context.unrouteAll({ behavior: "ignoreErrors" })
  }

  requests(path: string | RegExp, method?: string) {
    return this.sent.filter(r =>
      (typeof path === "string" ? r.path === path : path.test(r.path)) && (!method || r.method === method))
  }

  private json(route: Route, status: number, body?: unknown) {
    return route.fulfill({
      status,
      contentType: "application/json",
      headers: { "access-control-allow-origin": "*" },
      body: body === undefined ? "" : JSON.stringify(body),
    })
  }

  private async handle(route: Route) {
    const req = route.request()
    const url = new URL(req.url())
    const path = url.pathname + url.search
    const method = req.method()
    if (method === "OPTIONS") {
      return route.fulfill({ status: 204, headers: {
        "access-control-allow-origin": "*",
        "access-control-allow-methods": "GET,POST,DELETE,OPTIONS",
        "access-control-allow-headers": "content-type",
      } })
    }
    let body: Record<string, unknown> | null = null
    try { body = req.postDataJSON() } catch { body = null }
    this.sent.push({ method, path: url.pathname, body })

    if (url.pathname === "/health") {
      if (this.wakeDelayMs) await new Promise(r => setTimeout(r, this.wakeDelayMs))
      return this.json(route, 200, { ok: true })
    }
    if (url.pathname === "/random-movie") {
      if (this.rollStatus) return this.json(route, this.rollStatus, { detail: "forced" })
      return this.json(route, 200, makeMovie(this.nextId++))
    }
    if (url.pathname === "/for-you") return this.json(route, 202, { enough_data: false })
    if (url.pathname === "/genres") {
      return this.json(route, 200, { genres: [{ id: 18, name: "Drama" }, { id: 35, name: "Comedy" }, { id: 27, name: "Horror" }] })
    }
    if (url.pathname === "/interactions" || url.pathname === "/interactions/undo") return this.json(route, 200, { ok: true })
    if (url.pathname === "/events") return this.json(route, 204)
    if (url.pathname === "/stats") return this.json(route, this.statsStatus, this.statsStatus === 200 ? this.stats : { detail: "down" })
    let m = url.pathname.match(/^\/users\/[^/]+\/history$/)
    if (m) {
      const status = url.searchParams.get("status")
      const list = status === "liked" ? this.liked : status === "watched" ? this.watched : []
      return this.json(route, 200, list.map(mv => ({
        tmdb_movie_id: mv.id, status, skip: false, last_surfaced_at: null,
        created_at: "2026-10-24T00:00:00Z", updated_at: "2026-10-24T00:00:00Z",
      })))
    }
    m = url.pathname.match(/^\/movies\/(\d+)$/)
    if (m) {
      const id = Number(m[1])
      const found = [...this.liked, ...this.watched].find(x => x.id === id) ?? makeMovie(id)
      return this.json(route, 200, found)
    }
    if (method === "DELETE" && /^\/interactions\//.test(url.pathname)) return this.json(route, 204)
    if (method === "DELETE" && /^\/users\/[^/]+$/.test(url.pathname)) return this.json(route, 204)
    return this.json(route, 404, { detail: `mock: no route for ${method} ${path}` })
  }
}

/** `api` fixture: installed on the browser context before any page loads. */
export const test = base.extend<{ api: MockApi }>({
  // (The callback is named `provide`, not `use`, so React's lint rules
  // don't mistake it for a React hook.)
  api: async ({ context }, provide) => {
    const api = new MockApi(context)
    await api.install()
    await provide(api)
    await api.uninstall()
  },
  // Every test gets the mock, even ones that don't use `api` directly.
  page: async ({ page, api }, provide) => {
    void api
    await provide(page)
  },
})

export { expect }

/** The movie title currently on screen (works for both layouts). */
export function cardTitle(page: Page) {
  return page.locator("h2:visible").first()
}

/** A control that exists in both layouts: pick the one actually visible. */
export function visible(page: Page, selector: string) {
  return page.locator(`${selector}:visible`).first()
}
