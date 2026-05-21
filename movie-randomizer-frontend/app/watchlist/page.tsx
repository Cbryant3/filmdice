"use client"

import { useEffect, useState } from "react"
import type { InteractionRecord, Movie } from "@/lib/types"
import { fetchWatchlist, fetchMovieById, deleteInteraction } from "@/lib/api"
import { getUserId } from "@/lib/userId"
import TrailerModal from "@/components/TrailerModal"

interface EnrichedItem {
  record: InteractionRecord
  movie: Movie | null
  loading: boolean
}

export default function WatchlistPage() {
  const [items, setItems] = useState<EnrichedItem[]>([])
  const [pageState, setPageState] = useState<"loading" | "idle" | "empty">("loading")
  const [trailer, setTrailer] = useState<string | null>(null)

  useEffect(() => {
    const uid = getUserId()
    fetchWatchlist(uid)
      .then(async (records) => {
        if (records.length === 0) { setPageState("empty"); return }

        // Show stubs immediately, then hydrate with movie details
        const stubs: EnrichedItem[] = records.map(r => ({ record: r, movie: null, loading: true }))
        setItems(stubs)
        setPageState("idle")

        records.forEach(async (r, i) => {
          try {
            const movie = await fetchMovieById(r.tmdb_movie_id)
            setItems(prev => prev.map((item, idx) =>
              idx === i ? { ...item, movie, loading: false } : item
            ))
          } catch {
            setItems(prev => prev.map((item, idx) =>
              idx === i ? { ...item, loading: false } : item
            ))
          }
        })
      })
      .catch(() => setPageState("empty"))
  }, [])

  async function handleRemove(record: InteractionRecord) {
    const uid = getUserId()
    await deleteInteraction(uid, record.tmdb_movie_id).catch(console.error)
    setItems(prev => prev.filter(i => i.record.tmdb_movie_id !== record.tmdb_movie_id))
    if (items.length === 1) setPageState("empty")
  }

  return (
    <main className="min-h-screen bg-zinc-950 pb-24">
      <header className="px-5 pt-6 pb-4 border-b border-zinc-800">
        <h1 className="text-white text-2xl font-black tracking-tight">
          Film<span className="text-indigo-400">Dice</span>
        </h1>
        <p className="text-zinc-400 text-sm mt-1">Your liked movies</p>
      </header>

      {pageState === "loading" && (
        <div className="flex items-center justify-center h-64">
          <div className="text-zinc-600 text-sm">Loading watchlist…</div>
        </div>
      )}

      {pageState === "empty" && (
        <div className="flex flex-col items-center justify-center h-64 gap-3 text-center px-6">
          <div className="text-5xl">♥</div>
          <p className="text-white font-semibold">Nothing here yet</p>
          <p className="text-zinc-400 text-sm">Swipe right on a movie to save it</p>
        </div>
      )}

      {pageState === "idle" && (
        <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3">
          {items.map(({ record, movie, loading }) => (
            <div key={record.tmdb_movie_id} className="relative rounded-xl overflow-hidden bg-zinc-800 aspect-[2/3]">
              {loading && (
                <div className="absolute inset-0 bg-zinc-800 animate-pulse" />
              )}

              {movie?.poster_url && (
                <img
                  src={movie.poster_url}
                  alt={movie.title}
                  className="w-full h-full object-cover"
                />
              )}

              {/* Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

              {/* Info */}
              {movie && (
                <div className="absolute bottom-0 left-0 right-0 p-2.5 space-y-1.5">
                  <p className="text-white text-xs font-semibold leading-tight line-clamp-2">
                    {movie.title}
                  </p>
                  <div className="flex gap-1.5">
                    {movie.trailer_url && (
                      <button
                        onClick={() => setTrailer(movie.trailer_url!)}
                        className="text-[10px] bg-white/20 hover:bg-white/30 text-white px-2 py-0.5 rounded-full transition-colors"
                      >
                        ▶ Trailer
                      </button>
                    )}
                    <button
                      onClick={() => handleRemove(record)}
                      className="text-[10px] bg-red-900/60 hover:bg-red-700/80 text-red-300 px-2 py-0.5 rounded-full transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {trailer && (
        <TrailerModal trailerUrl={trailer} onClose={() => setTrailer(null)} />
      )}
    </main>
  )
}
