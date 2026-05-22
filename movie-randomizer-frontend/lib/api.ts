import type { Filters, Genre, InteractionRecord, Movie, UserPreferences } from "./types"

const BASE = process.env.NEXT_PUBLIC_API_URL ??
  (typeof window !== "undefined"
    ? `http://${window.location.hostname}:8000`
    : "http://localhost:8000")

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 15_000)
  let res: Response
  try {
    res = await fetch(`${BASE}${path}`, {
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      ...init,
    })
  } catch (err) {
    if ((err as Error).name === "AbortError") throw new Error("Request timed out - is the backend running?")
    throw err
  } finally {
    clearTimeout(timer)
  }
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`${res.status} ${res.statusText}: ${body}`)
  }
  return res.json() as Promise<T>
}

export async function fetchRandomMovie(
  userId: string,
  filters: Filters = {},
  rerollMax = 10,
): Promise<Movie> {
  return req<Movie>("/random-movie", {
    method: "POST",
    body: JSON.stringify({ user_id: userId, filters, reroll_max: rerollMax }),
  })
}

export async function fetchGenres(): Promise<Genre[]> {
  const data = await req<{ genres: Genre[] }>("/genres")
  return data.genres
}

export async function fetchWatchlist(userId: string): Promise<InteractionRecord[]> {
  return req<InteractionRecord[]>(`/users/${userId}/history?status=liked`)
}

export async function fetchWatched(userId: string): Promise<InteractionRecord[]> {
  return req<InteractionRecord[]>(`/users/${userId}/history?status=watched`)
}

export async function fetchMovieById(id: number): Promise<Movie> {
  return req<Movie>(`/movies/${id}`)
}

export async function sendInteraction(
  userId: string,
  movieId: number,
  status?: "unseen" | "watched" | "liked" | "dropped",
  skip?: boolean,
): Promise<void> {
  await req("/interactions", {
    method: "POST",
    body: JSON.stringify({ user_id: userId, tmdb_movie_id: movieId, status, skip }),
  })
}

export async function deleteInteraction(userId: string, movieId: number): Promise<void> {
  await req(`/interactions/${userId}/${movieId}`, { method: "DELETE" })
}

export async function fetchForYou(userId: string, region?: string, rerollMax = 10): Promise<Movie | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 15_000)
  let res: Response
  try {
    res = await fetch(`${BASE}/for-you`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, region: region || "US", reroll_max: rerollMax }),
      signal: controller.signal,
    })
  } catch (err) {
    if ((err as Error).name === "AbortError") throw new Error("Request timed out - is the backend running?")
    throw err
  } finally {
    clearTimeout(timer)
  }
  // 202 = not enough data yet — caller should fall back to regular random
  if (res.status === 202) return null
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  return res.json() as Promise<Movie>
}

export async function fetchUserPreferences(userId: string): Promise<UserPreferences> {
  return req<UserPreferences>(`/users/${userId}/preferences`)
}

export const posterUrl = (path: string | null, size = "w500") =>
  path ? `https://image.tmdb.org/t/p/${size}${path}` : null

export const logoUrl = (path: string | null) =>
  path ? `https://image.tmdb.org/t/p/w92${path}` : null
