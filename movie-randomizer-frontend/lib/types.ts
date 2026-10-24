export interface Provider {
  logo_path: string
  provider_id: number
  provider_name: string
  display_priority: number
}

export interface WhereToWatch {
  region: string
  link: string | null
  flatrate: Provider[]
  rent: Provider[]
  buy: Provider[]
}

export interface Movie {
  id: number
  title: string
  overview: string | null
  poster_url: string | null
  runtime: number | null
  release_year: number | null
  trailer_url: string | null
  where_to_watch: WhereToWatch | null
  content_rating: string | null
  is_for_you?: boolean
  genre_ids?: number[] | null
}

export interface GenreScore {
  genre_id: number
  genre_name: string
  score: number
}

export interface DecadeScore {
  decade: number
  score: number
}

export interface UserPreferences {
  user_id: string
  top_genres: GenreScore[]
  top_decades: DecadeScore[]
  liked_count: number
  total_interactions: number
}

export interface Genre {
  id: number
  name: string
}

export interface Filters {
  genre_ids?: number[]
  exclude_genre_ids?: number[]
  year_min?: number
  year_max?: number
  decades?: number[]
  rating_min?: number
  rating_max?: number
  vote_count_min?: number
  runtime_min?: number
  runtime_max?: number
  language?: string
  region?: string
  must_be_streaming?: boolean
  content_rating_include?: string[]
  content_rating_exclude?: string[]
  sort_by?: "popularity.desc" | "vote_average.desc" | "primary_release_date.desc"
}

export interface InteractionRecord {
  tmdb_movie_id: number
  status: string
  skip: boolean
  last_surfaced_at: string | null
  created_at: string | null
  updated_at: string | null
}

// Shape of GET /stats (anonymous public metrics).
export interface PublicStats {
  generated_at: string
  tracking_since: string | null
  users: {
    total: number; signed_in: number; guests: number
    active_7d: number; active_30d: number; returning: number
    avg_swipes_per_user: number | null
  }
  swipes: { movies_served: number; total: number; likes: number; skips: number; watched: number; like_rate: number | null }
  for_you: { shown: number; swipes: number; likes: number; like_rate: number | null; random_like_rate: number | null }
  engine: { roll_requests: number; no_results_rate: number | null; avg_rerolls_per_pick: number | null }
  engagement: { trailer_plays: number; watch_link_taps: number }
  filters: { rolls_with_filters_rate: number | null; usage: { filter: string; rolls: number }[] }
  taste: {
    top_genres: { genre: string; likes: number }[]
    top_decades: { decade: number; likes: number }[]
    top_movies: { id: number; title: string | null; year: number | null; poster_url: string | null; likes: number }[]
  }
  series: { day: string; rolls: number; swipes: number; likes: number; new_users: number }[]
  health: {
    up_since: string; uptime_seconds: number; requests: number; server_errors: number
    error_rate: number | null; latency_ms_p50: number | null; latency_ms_p95: number | null
    latency_samples: number; tmdb_calls: number
  }
}
