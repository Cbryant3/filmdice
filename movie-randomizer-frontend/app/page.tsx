"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useSession } from "next-auth/react"
import type { Filters, Movie } from "@/lib/types"
import { fetchRandomMovie, fetchForYou, sendInteraction } from "@/lib/api"
import { getUserId } from "@/lib/userId"
import MovieCard from "@/components/MovieCard"
import FilterPanel from "@/components/FilterPanel"
import DiceLoader from "@/components/DiceLoader"
import type { SwipeDirection } from "@/hooks/useSwipe"

type CardState = "idle" | "loading" | "empty" | "error"

export default function DiscoverPage() {
  const { data: session, status: sessionStatus } = useSession()
  const [movie, setMovie] = useState<Movie | null>(null)
  const [state, setState] = useState<CardState>("loading")
  const [loadCount, setLoadCount] = useState(0)
  const [filters, setFilters] = useState<Filters>({})
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const userId = useRef<string>("")
  const filtersRef = useRef<Filters>({})
  const swipeCount = useRef<number>(0)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prefetchedMovie = useRef<Movie | null>(null)
  const prefetching = useRef(false)

  // Wait for session to resolve so we use the real user ID if signed in
  useEffect(() => {
    if (sessionStatus === "loading") return
    userId.current = session?.user?.id ?? getUserId()
    loadNext({})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionStatus])

  // Keep a ref in sync so loadNext always has the latest filters without stale closure
  useEffect(() => { filtersRef.current = filters }, [filters])

  const prefetchNext = useCallback(async () => {
    if (prefetching.current) return
    prefetching.current = true
    try {
      const m = await fetchRandomMovie(userId.current, filtersRef.current)
      prefetchedMovie.current = m
    } catch {
      prefetchedMovie.current = null
    } finally {
      prefetching.current = false
    }
  }, [])

  const loadNext = useCallback(async (overrideFilters?: Filters) => {
    setState("loading")
    setMovie(null)
    setLoadCount(c => c + 1)
    try {
      const m = await fetchRandomMovie(userId.current, overrideFilters ?? filtersRef.current)
      setMovie(m)
      setState("idle")
      prefetchNext()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setState(msg.includes("404") ? "empty" : "error")
    }
  }, [prefetchNext])

  const loadForYou = useCallback(async () => {
    setState("loading")
    setMovie(null)
    setLoadCount(c => c + 1)
    try {
      const m = await fetchForYou(userId.current, filtersRef.current.region)
      if (m) {
        setMovie(m)
        setState("idle")
        prefetchNext()
      } else {
        loadNext()
      }
    } catch {
      loadNext()
    }
  }, [loadNext, prefetchNext])

  const handleSwipe = useCallback(async (dir: SwipeDirection, swiped: Movie) => {
    if (dir === "right") {
      showToast("Added to liked ♥")
      await sendInteraction(userId.current, swiped.id, "liked").catch(console.error)
    } else {
      await sendInteraction(userId.current, swiped.id, undefined, true).catch(console.error)
    }
    swipeCount.current += 1

    const pre = prefetchedMovie.current
    prefetchedMovie.current = null

    if (swipeCount.current % 10 === 0) {
      loadForYou()
    } else if (pre) {
      setMovie(pre)
      setState("idle")
      prefetchNext()
    } else {
      loadNext()
    }
  }, [loadNext, loadForYou, prefetchNext])

  function handleFiltersChange(f: Filters) {
    setFilters(f)
    filtersRef.current = f
  }

  function handleApplyFilters() {
    setFiltersOpen(false)
    loadNext(filtersRef.current)
  }

  function showToast(msg: string) {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToastMsg(msg)
    toastTimer.current = setTimeout(() => setToastMsg(null), 2000)
  }

  const activeFilterCount = Object.entries(filters).filter(
    ([, v]) => v !== undefined && v !== false && !(Array.isArray(v) && v.length === 0)
  ).length

  return (
    <main className="min-h-screen bg-zinc-950 flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-5 pt-6 pb-2">
        <h1 className="text-white text-2xl font-black tracking-tight">
          Film<span className="text-indigo-400">Dice</span>
        </h1>
        <button
          onClick={() => setFiltersOpen(true)}
          className="flex items-center gap-2 text-sm font-medium text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded-full transition-colors"
        >
          <span>⚙</span> Filters
          {activeFilterCount > 0 && (
            <span className="w-2 h-2 bg-indigo-400 rounded-full" />
          )}
        </button>
      </header>

      {/* Card area */}
      <div className="flex-1 flex items-start justify-center px-5 pt-10 pb-24 lg:items-center lg:pt-0">
        <div className="relative w-full max-w-sm h-[520px] lg:max-w-4xl lg:h-auto">
          {state === "loading" && (
            <div className="absolute inset-0 rounded-2xl bg-zinc-800/50 flex items-center justify-center lg:rounded-2xl">
              <DiceLoader key={loadCount} />
            </div>
          )}

          {state === "empty" && (
            <div className="absolute inset-0 rounded-2xl bg-zinc-800 flex flex-col items-center justify-center gap-4 text-center px-6">
              <div className="text-5xl">🎬</div>
              <p className="text-white font-semibold text-lg">No movies found</p>
              <p className="text-zinc-400 text-sm">Try adjusting your filters</p>
              <button
                onClick={() => setFiltersOpen(true)}
                className="mt-2 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-full text-sm font-medium transition-colors"
              >
                Open Filters
              </button>
            </div>
          )}

          {state === "error" && (
            <div className="absolute inset-0 rounded-2xl bg-zinc-800 flex flex-col items-center justify-center gap-4 text-center px-6">
              <div className="text-5xl">⚠️</div>
              <p className="text-white font-semibold">Something went wrong</p>
              <p className="text-zinc-400 text-sm">Make sure the backend is running</p>
              <button
                onClick={() => loadNext()}
                className="bg-zinc-700 hover:bg-zinc-600 text-white px-6 py-2 rounded-full text-sm font-medium transition-colors"
              >
                Try Again
              </button>
            </div>
          )}

          {state === "idle" && movie && (
            <MovieCard movie={movie} onSwipe={handleSwipe} />
          )}
        </div>
      </div>

      {/* Toast */}
      {toastMsg && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-zinc-700 text-white text-xs font-medium px-3 py-2 rounded-full shadow-lg whitespace-nowrap">
          {toastMsg}
        </div>
      )}

      <FilterPanel
        open={filtersOpen}
        onClose={handleApplyFilters}
        filters={filters}
        onChange={handleFiltersChange}
      />
    </main>
  )
}
