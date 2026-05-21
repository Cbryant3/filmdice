"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import type { InteractionRecord, Movie } from "@/lib/types"
import { fetchWatchlist, fetchWatched, fetchMovieById, deleteInteraction } from "@/lib/api"
import { getUserId } from "@/lib/userId"
import TrailerModal from "@/components/TrailerModal"

interface EnrichedItem {
  record: InteractionRecord
  movie: Movie | null
  loading: boolean
}

type Tab = "liked" | "watched"

export default function WatchlistPage() {
  const { data: session, status: sessionStatus } = useSession()
  const [tab, setTab] = useState<Tab>("liked")
  const [likedItems, setLikedItems] = useState<EnrichedItem[]>([])
  const [watchedItems, setWatchedItems] = useState<EnrichedItem[]>([])
  const [pageState, setPageState] = useState<"loading" | "idle" | "empty">("loading")
  const [trailer, setTrailer] = useState<string | null>(null)

  useEffect(() => {
    if (sessionStatus === "loading") return
    const uid = session?.user?.id ?? getUserId()

    async function load() {
      const [liked, watched] = await Promise.all([
        fetchWatchlist(uid).catch(() => [] as InteractionRecord[]),
        fetchWatched(uid).catch(() => [] as InteractionRecord[]),
      ])

      if (liked.length === 0 && watched.length === 0) {
        setPageState("empty")
        return
      }

      setPageState("idle")

      function hydrateInto(
        records: InteractionRecord[],
        setter: React.Dispatch<React.SetStateAction<EnrichedItem[]>>,
      ) {
        setter(records.map(r => ({ record: r, movie: null, loading: true })))
        records.forEach((r, i) => {
          fetchMovieById(r.tmdb_movie_id)
            .then(movie => setter(prev => prev.map((item, idx) => idx === i ? { ...item, movie, loading: false } : item)))
            .catch(()  => setter(prev => prev.map((item, idx) => idx === i ? { ...item, loading: false } : item)))
        })
      }

      hydrateInto(liked, setLikedItems)
      hydrateInto(watched, setWatchedItems)
    }

    load().catch(() => setPageState("empty"))
  }, [sessionStatus, session])

  async function handleRemove(record: InteractionRecord, fromTab: Tab) {
    const uid = session?.user?.id ?? getUserId()
    await deleteInteraction(uid, record.tmdb_movie_id).catch(console.error)
    const setter = fromTab === "liked" ? setLikedItems : setWatchedItems
    setter(prev => {
      const remaining = prev.filter(i => i.record.tmdb_movie_id !== record.tmdb_movie_id)
      if (remaining.length === 0 && (fromTab === "liked" ? watchedItems : likedItems).length === 0) {
        setPageState("empty")
      }
      return remaining
    })
  }

  const activeItems = tab === "liked" ? likedItems : watchedItems

  return (
    <main className="min-h-screen bg-zinc-950 pb-24">
      <header className="px-5 pt-6 pb-4 border-b border-zinc-800">
        <h1 className="text-white text-2xl font-black tracking-tight">
          Film<span className="text-indigo-400">Dice</span>
        </h1>
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => setTab("liked")}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              tab === "liked"
                ? "bg-indigo-600 border-indigo-600 text-white"
                : "bg-transparent border-zinc-600 text-zinc-400 hover:border-zinc-400"
            }`}
          >
            Liked {likedItems.length > 0 && `(${likedItems.length})`}
          </button>
          <button
            onClick={() => setTab("watched")}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              tab === "watched"
                ? "bg-blue-600 border-blue-600 text-white"
                : "bg-transparent border-zinc-600 text-zinc-400 hover:border-zinc-400"
            }`}
          >
            Watched {watchedItems.length > 0 && `(${watchedItems.length})`}
          </button>
        </div>
      </header>

      {pageState === "loading" && (
        <div className="flex items-center justify-center h-64">
          <div className="text-zinc-600 text-sm">Loading…</div>
        </div>
      )}

      {pageState === "empty" && (
        <div className="flex flex-col items-center justify-center h-64 gap-3 text-center px-6">
          <div className="text-5xl">{tab === "liked" ? "♥" : "👁"}</div>
          <p className="text-white font-semibold">Nothing here yet</p>
          <p className="text-zinc-400 text-sm">
            {tab === "liked" ? "Swipe right on a movie to save it" : "Swipe up on a movie to mark it watched"}
          </p>
        </div>
      )}

      {pageState === "idle" && activeItems.length === 0 && (
        <div className="flex flex-col items-center justify-center h-64 gap-3 text-center px-6">
          <div className="text-5xl">{tab === "liked" ? "♥" : "👁"}</div>
          <p className="text-white font-semibold">Nothing here yet</p>
          <p className="text-zinc-400 text-sm">
            {tab === "liked" ? "Swipe right on a movie to save it" : "Swipe up on a movie to mark it watched"}
          </p>
        </div>
      )}

      {pageState === "idle" && activeItems.length > 0 && (
        <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3">
          {activeItems.map(({ record, movie, loading }) => (
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

              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

              {movie && (
                <div className="absolute bottom-0 left-0 right-0 p-2.5 space-y-1.5">
                  <p className="text-white text-xs font-semibold leading-tight line-clamp-2">
                    {movie.title}
                  </p>
                  {(movie.release_year || movie.runtime) && (
                    <p className="text-white/50 text-[10px]">
                      {[movie.release_year, movie.runtime ? `${Math.floor(movie.runtime / 60)}h ${movie.runtime % 60}m` : null].filter(Boolean).join(" · ")}
                    </p>
                  )}
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
                      onClick={() => handleRemove(record, tab)}
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
