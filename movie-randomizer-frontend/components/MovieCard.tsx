"use client"

import { useState } from "react"
import type { Movie, Provider } from "@/lib/types"
import { logoUrl } from "@/lib/api"
import TrailerModal from "./TrailerModal"
import { useSwipe, type SwipeDirection } from "@/hooks/useSwipe"

interface Props {
  movie: Movie
  onSwipe: (dir: SwipeDirection, movie: Movie) => void
}

function ProviderRow({ label, providers, link }: { label: string; providers: Provider[]; link: string | null }) {
  if (!providers.length) return null
  return (
    <div>
      <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wider mb-2">{label}</p>
      <div className="flex flex-wrap gap-2">
        {providers.map((p) => {
          const url = logoUrl(p.logo_path)
          const Wrapper = link ? "a" : "div"
          return (
            <Wrapper
              key={p.provider_id}
              {...(link ? { href: link, target: "_blank", rel: "noopener noreferrer" } : {})}
              className="flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg px-2 py-1 transition-colors cursor-pointer group"
            >
              {url && (
                <img src={url} alt={p.provider_name} className="w-5 h-5 rounded object-cover" />
              )}
              <span className="text-zinc-300 text-xs group-hover:text-white transition-colors">{p.provider_name}</span>
              {link && <span className="text-zinc-600 text-[10px] group-hover:text-zinc-400 transition-colors">↗</span>}
            </Wrapper>
          )
        })}
      </div>
    </div>
  )
}

export default function MovieCard({ movie, onSwipe }: Props) {
  const [showTrailer, setShowTrailer] = useState(false)

  const { style, likeIndicator, nopeIndicator, watchedIndicator, triggerSwipe, handlers } =
    useSwipe((dir) => onSwipe(dir, movie))

  const flatrate = movie.where_to_watch?.flatrate ?? []
  const rent     = movie.where_to_watch?.rent     ?? []
  const buy      = movie.where_to_watch?.buy      ?? []
  const hasProviders = flatrate.length + rent.length + buy.length > 0

  const runtime = movie.runtime
    ? `${Math.floor(movie.runtime / 60)}h ${movie.runtime % 60}m`
    : null

  return (
    <>
      {/* ── Outer card — mobile: absolute fill, desktop: relative two-column flex ── */}
      <div
        style={style}
        {...handlers}
        className="
          absolute inset-0 rounded-2xl overflow-hidden shadow-2xl select-none touch-none
          lg:relative lg:inset-auto lg:flex lg:h-[580px] lg:w-full
        "
      >
        {/* ── LEFT: poster column ── */}
        <div className="relative h-full lg:w-64 lg:shrink-0">
          {movie.poster_url ? (
            <img
              src={movie.poster_url}
              alt={movie.title}
              className="w-full h-full object-cover"
              draggable={false}
            />
          ) : (
            <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
              <span className="text-zinc-500">No poster</span>
            </div>
          )}

          {/* Gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

          {/* LIKE stamp */}
          <div
            className="absolute top-10 left-6 border-4 border-green-400 text-green-400 font-black text-3xl tracking-widest px-3 py-1 rounded-lg rotate-[-20deg]"
            style={{ opacity: likeIndicator }}
          >
            LIKE
          </div>

          {/* NOPE stamp */}
          <div
            className="absolute top-10 right-6 border-4 border-red-500 text-red-500 font-black text-3xl tracking-widest px-3 py-1 rounded-lg rotate-[20deg]"
            style={{ opacity: nopeIndicator }}
          >
            NOPE
          </div>

          {/* WATCHED stamp */}
          <div
            className="absolute top-10 left-1/2 -translate-x-1/2 border-4 border-blue-400 text-blue-400 font-black text-3xl tracking-widest px-3 py-1 rounded-lg"
            style={{ opacity: watchedIndicator }}
          >
            SEEN
          </div>

          {/* ── Mobile-only info overlay ── */}
          <div className="lg:hidden absolute bottom-0 left-0 right-0 p-4 space-y-2">
            {movie.is_for_you && (
              <div className="inline-flex items-center gap-1 bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-semibold px-2 py-0.5 rounded-full mb-1.5">
                ⭐ For You
              </div>
            )}
            <div className="flex items-end justify-between gap-2">
              <h2 className="text-white text-xl font-bold leading-tight drop-shadow">{movie.title}</h2>
              {movie.content_rating && (
                <span className="shrink-0 text-xs font-semibold border border-white/60 text-white/80 px-2 py-0.5 rounded">
                  {movie.content_rating}
                </span>
              )}
            </div>
            {(runtime || movie.release_year) && (
              <p className="text-white/70 text-sm">
                {[runtime, movie.release_year].filter(Boolean).join(" · ")}
              </p>
            )}
            {movie.overview && (
              <p className="text-white/60 text-xs line-clamp-2 leading-relaxed">{movie.overview}</p>
            )}
            <div className="flex items-center justify-between pt-1">
              <div className="flex gap-1.5">
                {flatrate.slice(0, 4).map((p) => {
                  const url = logoUrl(p.logo_path)
                  if (!url) return null
                  const jwLink = movie.where_to_watch?.link
                  return jwLink ? (
                    <a key={p.provider_id} href={jwLink} target="_blank" rel="noopener noreferrer"
                      onPointerDown={e => e.stopPropagation()}>
                      <img src={url} alt={p.provider_name} title={p.provider_name}
                        className="w-7 h-7 rounded-md object-cover hover:ring-2 hover:ring-white/50 transition-all" />
                    </a>
                  ) : (
                    <img key={p.provider_id} src={url} alt={p.provider_name} title={p.provider_name}
                      className="w-7 h-7 rounded-md object-cover" />
                  )
                })}
              </div>
              {movie.trailer_url && (
                <button
                  onPointerDown={e => e.stopPropagation()}
                  onClick={e => { e.stopPropagation(); setShowTrailer(true) }}
                  className="text-xs text-white/80 hover:text-white bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-full transition-colors"
                >
                  ▶ Trailer
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── RIGHT: desktop-only details panel ── */}
        <div className="hidden lg:flex flex-col flex-1 bg-zinc-900 overflow-y-auto">
          <div className="flex flex-col flex-1 p-6 gap-5">

            {/* Title + meta */}
            <div className="space-y-1">
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-white text-2xl font-bold leading-tight">{movie.title}</h2>
                {movie.content_rating && (
                  <span className="shrink-0 mt-1 text-xs font-semibold border border-zinc-500 text-zinc-400 px-2 py-0.5 rounded">
                    {movie.content_rating}
                  </span>
                )}
              </div>
              {(runtime || movie.release_year) && (
                <p className="text-zinc-400 text-sm">
                  {[runtime, movie.release_year].filter(Boolean).join(" · ")}
                </p>
              )}
              {movie.is_for_you && (
                <div className="inline-flex items-center gap-1 bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-semibold px-2 py-0.5 rounded-full mt-1">
                  ⭐ For You
                </div>
              )}
            </div>

            {/* Full overview */}
            {movie.overview && (
              <div>
                <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wider mb-1.5">Overview</p>
                <p className="text-zinc-300 text-sm leading-relaxed">{movie.overview}</p>
              </div>
            )}

            {/* Where to watch */}
            {hasProviders && (
              <div className="space-y-4">
                <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wider">Where to Watch</p>
                <ProviderRow label="Stream" providers={flatrate} link={movie.where_to_watch?.link ?? null} />
                <ProviderRow label="Rent"   providers={rent}    link={movie.where_to_watch?.link ?? null} />
                <ProviderRow label="Buy"    providers={buy}     link={movie.where_to_watch?.link ?? null} />
              </div>
            )}

            {!hasProviders && (
              <p className="text-zinc-600 text-sm">No streaming info available for your region.</p>
            )}
          </div>

          {/* Desktop action bar — pinned to bottom of panel */}
          <div className="shrink-0 border-t border-zinc-800 px-6 py-4 flex items-center justify-between gap-3">
            {movie.trailer_url ? (
              <button
                onPointerDown={e => e.stopPropagation()}
                onClick={e => { e.stopPropagation(); setShowTrailer(true) }}
                className="flex items-center gap-2 text-sm text-white/80 hover:text-white bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded-full transition-colors"
              >
                ▶ Watch Trailer
              </button>
            ) : <div />}

            <div className="flex gap-3">
              <button
                onPointerDown={e => e.stopPropagation()}
                onClick={e => { e.stopPropagation(); triggerSwipe("left") }}
                className="w-12 h-12 rounded-full bg-zinc-800 border-2 border-red-500 text-red-500 text-xl flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors"
                title="Skip"
              >
                ✕
              </button>
              <button
                onPointerDown={e => e.stopPropagation()}
                onClick={e => { e.stopPropagation(); triggerSwipe("up") }}
                className="w-12 h-12 rounded-full bg-zinc-800 border-2 border-blue-400 text-blue-400 text-xl flex items-center justify-center hover:bg-blue-400 hover:text-white transition-colors"
                title="Mark as Watched"
              >
                👁
              </button>
              <button
                onPointerDown={e => e.stopPropagation()}
                onClick={e => { e.stopPropagation(); triggerSwipe("right") }}
                className="w-12 h-12 rounded-full bg-zinc-800 border-2 border-green-400 text-green-400 text-xl flex items-center justify-center hover:bg-green-400 hover:text-white transition-colors"
                title="Like"
              >
                ♥
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Mobile-only swipe buttons (below card) ── */}
      <div className="lg:hidden absolute -bottom-16 left-0 right-0 flex justify-center gap-6">
        <button
          onClick={() => triggerSwipe("left")}
          className="w-14 h-14 rounded-full bg-zinc-800 border-2 border-red-500 text-red-500 text-2xl flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors shadow-lg"
          title="Skip"
        >
          ✕
        </button>
        <button
          onClick={() => triggerSwipe("up")}
          className="w-14 h-14 rounded-full bg-zinc-800 border-2 border-blue-400 text-blue-400 text-2xl flex items-center justify-center hover:bg-blue-400 hover:text-white transition-colors shadow-lg"
          title="Mark as Watched"
        >
          👁
        </button>
        <button
          onClick={() => triggerSwipe("right")}
          className="w-14 h-14 rounded-full bg-zinc-800 border-2 border-green-400 text-green-400 text-2xl flex items-center justify-center hover:bg-green-400 hover:text-white transition-colors shadow-lg"
          title="Like"
        >
          ♥
        </button>
      </div>

      {showTrailer && movie.trailer_url && (
        <TrailerModal trailerUrl={movie.trailer_url} onClose={() => setShowTrailer(false)} />
      )}
    </>
  )
}
