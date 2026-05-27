"use client"

import { useEffect, useState } from "react"
import type { Movie, Provider } from "@/lib/types"
import { logoUrl } from "@/lib/api"
import TrailerModal from "./TrailerModal"

interface Props {
  movie: Movie
  onClose: () => void
}

function ProviderRow({ label, providers, link }: { label: string; providers: Provider[]; link: string | null }) {
  if (!providers.length) return null
  return (
    <div>
      <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wider mb-2">{label}</p>
      <div className="flex flex-wrap gap-2 mb-3">
        {providers.map((p) => {
          const url = logoUrl(p.logo_path)
          const Wrapper = link ? "a" : "div"
          return (
            <Wrapper
              key={p.provider_id}
              {...(link ? { href: link, target: "_blank", rel: "noopener noreferrer" } : {})}
              className="flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg px-2 py-1 transition-colors"
            >
              {url && <img src={url} alt={p.provider_name} className="w-5 h-5 rounded object-cover" />}
              <span className="text-zinc-300 text-xs">{p.provider_name}</span>
              {link && <span className="text-zinc-600 text-[10px]">↗</span>}
            </Wrapper>
          )
        })}
      </div>
    </div>
  )
}

export default function MovieDetailModal({ movie, onClose }: Props) {
  const [showTrailer, setShowTrailer] = useState(false)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [onClose])

  const flatrate = movie.where_to_watch?.flatrate ?? []
  const rent     = movie.where_to_watch?.rent     ?? []
  const buy      = movie.where_to_watch?.buy      ?? []
  const hasProviders = flatrate.length + rent.length + buy.length > 0
  const jwLink = movie.where_to_watch?.link ?? null

  const runtime = movie.runtime
    ? `${Math.floor(movie.runtime / 60)}h ${movie.runtime % 60}m`
    : null

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center"
        onClick={onClose}
      >
        <div
          className="bg-zinc-900 w-full max-w-lg max-h-[85vh] rounded-t-2xl sm:rounded-2xl overflow-y-auto flex flex-col"
          onClick={e => e.stopPropagation()}
        >
          {/* Poster */}
          <div className="relative w-full shrink-0" style={{ aspectRatio: "2/3", maxHeight: "45vw" }}>
            {movie.poster_url ? (
              <img
                src={movie.poster_url}
                alt={movie.title}
                className="w-full h-full object-cover rounded-t-2xl sm:rounded-t-2xl"
              />
            ) : (
              <div className="w-full h-full bg-zinc-800 rounded-t-2xl flex items-center justify-center">
                <span className="text-zinc-500 text-sm">No poster</span>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-transparent to-transparent rounded-t-2xl" />
            <button
              onClick={onClose}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 text-white/80 hover:text-white flex items-center justify-center text-sm"
            >
              ✕
            </button>
          </div>

          {/* Details */}
          <div className="p-5 space-y-4">
            {/* Title + meta */}
            <div className="space-y-1">
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-white text-xl font-bold leading-tight">{movie.title}</h2>
                {movie.content_rating && (
                  <span className="shrink-0 mt-0.5 text-xs font-semibold border border-zinc-500 text-zinc-400 px-2 py-0.5 rounded">
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
                <div className="inline-flex items-center gap-1 bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-semibold px-2 py-0.5 rounded-full">
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
              <div>
                <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wider mb-3">Where to Watch</p>
                <ProviderRow label="Stream" providers={flatrate} link={jwLink} />
                <ProviderRow label="Rent"   providers={rent}     link={jwLink} />
                <ProviderRow label="Buy"    providers={buy}      link={jwLink} />
              </div>
            )}

            {!hasProviders && (
              <p className="text-zinc-600 text-sm">No streaming info available for your region.</p>
            )}

            {/* Trailer button */}
            {movie.trailer_url && (
              <button
                onClick={() => setShowTrailer(true)}
                className="w-full flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-medium py-3 rounded-xl transition-colors"
              >
                ▶ Watch Trailer
              </button>
            )}
          </div>
        </div>
      </div>

      {showTrailer && movie.trailer_url && (
        <TrailerModal trailerUrl={movie.trailer_url} onClose={() => setShowTrailer(false)} />
      )}
    </>
  )
}
