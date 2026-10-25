"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useSession } from "next-auth/react"
import type { Filters, Movie } from "@/lib/types"
import { fetchRandomMovie, fetchForYou, sendInteraction, undoInteraction } from "@/lib/api"
import { getUserId } from "@/lib/userId"
import MovieCard from "@/components/MovieCard"
import FilterPanel from "@/components/FilterPanel"
import DiceLoader from "@/components/DiceLoader"
import type { SwipeDirection } from "@/hooks/useSwipe"

type CardState = "idle" | "loading" | "empty" | "error" | "limited"

// Stable comparison key for filters: ignores unset values, empty lists and
// false toggles, and sorts keys/arrays so toggling something on and back off
// counts as "no change".
function filtersKey(f: Filters): string {
  const clean: Record<string, unknown> = {}
  for (const k of Object.keys(f).sort()) {
    const v = (f as Record<string, unknown>)[k]
    if (v === undefined || v === null || v === false || v === "") continue
    if (Array.isArray(v)) {
      if (v.length === 0) continue
      clean[k] = [...v].sort()
    } else {
      clean[k] = v
    }
  }
  return JSON.stringify(clean)
}

export default function DiscoverPage() {
  const { data: session, status: sessionStatus } = useSession()
  const [movie, setMovie] = useState<Movie | null>(null)
  const [state, setState] = useState<CardState>("loading")
  const [loadCount, setLoadCount] = useState(0)
  const [filters, setFilters] = useState<Filters>({})
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  // True once a load has taken long enough that the server is probably waking up.
  const [slowLoad, setSlowLoad] = useState(false)
  const userId = useRef<string>("")
  const filtersRef = useRef<Filters>({})
  const swipeCount = useRef<number>(0)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prefetchedMovie = useRef<Movie | null>(null)
  // Swipes that can be undone (most recent last), and films put back in line
  // by an undo, which are shown again before any new roll.
  const history = useRef<{ movie: Movie; dir: SwipeDirection }[]>([])
  const upNext = useRef<Movie[]>([])
  const [canUndo, setCanUndo] = useState(false)
  const undoing = useRef(false)
  const prefetching = useRef(false)
  const filtersAtOpen = useRef<Filters>({})

  // Start loading immediately with guest ID; upgrade to session ID when auth resolves
  useEffect(() => {
    userId.current = getUserId()
    loadNext({})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (sessionStatus === "loading") return
    const resolvedId = session?.user?.id ?? getUserId()
    if (resolvedId !== userId.current) {
      userId.current = resolvedId
      loadNext({})
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionStatus])

  // Keep a ref in sync so loadNext always has the latest filters without stale closure
  useEffect(() => { filtersRef.current = filters }, [filters])

  const prefetchNext = useCallback(async () => {
    if (prefetching.current) return
    prefetching.current = true
    try {
      // Remember which filter set each fetch was made under. If the filters
      // change while it's in flight, the result is stale: discard it and
      // fetch again under the new filters.
      let key: string
      do {
        key = filtersKey(filtersRef.current)
        let m: Movie | null = null
        try {
          m = await fetchRandomMovie(userId.current, filtersRef.current)
        } catch {
          m = null
        }
        prefetchedMovie.current = key === filtersKey(filtersRef.current) ? m : null
      } while (key !== filtersKey(filtersRef.current))
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
      setState(msg.includes("404") ? "empty" : msg.includes("429") ? "limited" : "error")
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
    const context = swiped.is_for_you ? "for_you" : "swipe"
    if (dir === "right") {
      showToast("Added to liked ♥")
      await sendInteraction(userId.current, swiped.id, "liked", undefined, context).catch(console.error)
    } else if (dir === "up") {
      showToast("Marked as watched 👁")
      await sendInteraction(userId.current, swiped.id, "watched", undefined, context).catch(console.error)
    } else {
      await sendInteraction(userId.current, swiped.id, undefined, true, context).catch(console.error)
    }
    swipeCount.current += 1
    history.current = [...history.current.slice(-19), { movie: swiped, dir }]
    setCanUndo(true)

    // A film put back by undo comes first.
    const queued = upNext.current.pop()
    if (queued) {
      setMovie(queued)
      setState("idle")
      return
    }

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

  const handleUndo = useCallback(async () => {
    const last = history.current[history.current.length - 1]
    if (!last || undoing.current) return
    undoing.current = true
    try {
      const kind = last.dir === "right" ? "like" : last.dir === "up" ? "watched" : "skip"
      await undoInteraction(userId.current, last.movie.id, kind, last.movie.is_for_you ? "for_you" : "swipe")
      history.current = history.current.slice(0, -1)
      setCanUndo(history.current.length > 0)
      swipeCount.current = Math.max(0, swipeCount.current - 1)
      // Keep the film that was on screen: it's shown again after this one.
      if (movie) upNext.current.push(movie)
      setMovie(last.movie)
      setState("idle")
      showToast(kind === "like" ? "Removed from liked ↶" : kind === "watched" ? "Unmarked as watched ↶" : "Brought it back ↶")
    } catch {
      showToast("Couldn't undo. Try again.")
    } finally {
      undoing.current = false
    }
  }, [movie])

  function handleFiltersChange(f: Filters) {
    setFilters(f)
    filtersRef.current = f
  }

  function openFilters() {
    filtersAtOpen.current = filtersRef.current
    setFiltersOpen(true)
  }

  // Closing the panel never replaces the film on screen. New filters take
  // effect on the next roll and stay until changed, reset, or the app closes.
  function handleApplyFilters() {
    setFiltersOpen(false)
    const changed = filtersKey(filtersAtOpen.current) !== filtersKey(filtersRef.current)

    // No film on screen (empty/error/first load): roll now with current filters.
    if (!(state === "idle" && movie)) {
      prefetchedMovie.current = null
      loadNext(filtersRef.current)
      return
    }

    if (changed) {
      // The queued-up next film was picked under the old filters; swap it for
      // one that matches the new filters so the next roll honors them.
      prefetchedMovie.current = null
      prefetchNext()
    }
  }

  // After 5s of loading, explain the wait instead of leaving a silent spinner.
  useEffect(() => {
    if (state !== "loading") return
    const t = setTimeout(() => setSlowLoad(true), 5000)
    return () => { clearTimeout(t); setSlowLoad(false) }
  }, [state, loadCount])

  function showToast(msg: string) {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToastMsg(msg)
    toastTimer.current = setTimeout(() => setToastMsg(null), 2000)
  }

  const activeFilterCount = Object.entries(filters).filter(
    ([, v]) => v !== undefined && v !== false && !(Array.isArray(v) && v.length === 0)
  ).length

  return (
    <main className="h-dvh bg-zinc-950 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-5 pt-6 pb-2">
        <h1 className="text-white text-2xl font-black tracking-tight">
          Film<span className="text-indigo-400">Dice</span>
        </h1>
        <div className="flex-1 flex justify-center px-2">
          {toastMsg && (
            <div className="bg-zinc-700 text-white text-xs font-medium px-3 py-1.5 rounded-full shadow-lg whitespace-nowrap">
              {toastMsg}
            </div>
          )}
        </div>
        <button
          onClick={openFilters}
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
        <div className="relative w-full max-w-sm h-[min(440px,58svh)] lg:max-w-4xl lg:h-auto">
          {state === "loading" && (
            <div className="absolute inset-0 rounded-2xl bg-zinc-800/50 flex flex-col items-center justify-center gap-6 px-8 text-center lg:rounded-2xl">
              <DiceLoader key={loadCount} />
              {slowLoad && (
                <div aria-live="polite">
                  <p className="text-zinc-200 text-sm font-medium">Waking up the server…</p>
                  <p className="text-zinc-400 text-xs mt-1">
                    FilmDice naps when it&apos;s quiet. The first roll can take up to a minute. After that it&apos;s quick.
                  </p>
                </div>
              )}
            </div>
          )}

          {state === "empty" && (
            <div className="absolute inset-0 rounded-2xl bg-zinc-800 flex flex-col items-center justify-center gap-4 text-center px-6">
              <div className="text-5xl">🎬</div>
              <p className="text-white font-semibold text-lg">No movies found</p>
              <p className="text-zinc-400 text-sm">Try adjusting your filters</p>
              <button
                onClick={openFilters}
                className="mt-2 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-full text-sm font-medium transition-colors"
              >
                Open Filters
              </button>
            </div>
          )}

          {state === "error" && (
            <div className="absolute inset-0 rounded-2xl bg-zinc-800 flex flex-col items-center justify-center gap-4 text-center px-6">
              <div className="text-5xl">⚠️</div>
              <p className="text-white font-semibold">Couldn&apos;t roll a movie</p>
              <p className="text-zinc-400 text-sm">
                Check your connection and try again. If it keeps happening, the server may be restarting. Give it a minute.
              </p>
              <button
                onClick={() => loadNext()}
                className="bg-zinc-700 hover:bg-zinc-600 text-white px-6 py-2 rounded-full text-sm font-medium transition-colors"
              >
                Try Again
              </button>
            </div>
          )}

          {state === "limited" && (
            <div className="absolute inset-0 rounded-2xl bg-zinc-800 flex flex-col items-center justify-center gap-4 text-center px-6">
              <div className="text-5xl">🎲</div>
              <p className="text-white font-semibold">Whoa, slow down!</p>
              <p className="text-zinc-400 text-sm">You&apos;re rolling faster than the dice can keep up. Wait a few seconds and try again.</p>
              <button
                onClick={() => loadNext()}
                className="bg-zinc-700 hover:bg-zinc-600 text-white px-6 py-2 rounded-full text-sm font-medium transition-colors"
              >
                Try Again
              </button>
            </div>
          )}

          {state === "idle" && movie && (
            <MovieCard key={movie.id} movie={movie} onSwipe={handleSwipe} onUndo={handleUndo} canUndo={canUndo} />
          )}
        </div>
      </div>


      <FilterPanel
        open={filtersOpen}
        onClose={handleApplyFilters}
        filters={filters}
        onChange={handleFiltersChange}
      />
    </main>
  )
}
