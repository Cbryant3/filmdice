"use client"

import { useEffect, useState } from "react"
import type { Filters, Genre } from "@/lib/types"
import { fetchGenres } from "@/lib/api"
import RangeSlider from "./RangeSlider"

interface Props {
  open: boolean
  onClose: () => void
  filters: Filters
  onChange: (f: Filters) => void
}

const SORT_OPTIONS = [
  { value: "popularity.desc", label: "Most Popular" },
  { value: "vote_average.desc", label: "Highest Rated" },
  { value: "primary_release_date.desc", label: "Newest First" },
] as const

const DECADES = [1960, 1970, 1980, 1990, 2000, 2010, 2020]

const LANGUAGES: { code: string; label: string }[] = [
  { code: "",   label: "Any Language" },
  { code: "en", label: "English" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "es", label: "Spanish" },
  { code: "it", label: "Italian" },
  { code: "pt", label: "Portuguese" },
  { code: "ja", label: "Japanese" },
  { code: "ko", label: "Korean" },
  { code: "zh", label: "Chinese" },
  { code: "hi", label: "Hindi" },
  { code: "ru", label: "Russian" },
  { code: "ar", label: "Arabic" },
  { code: "tr", label: "Turkish" },
  { code: "nl", label: "Dutch" },
  { code: "sv", label: "Swedish" },
  { code: "pl", label: "Polish" },
  { code: "da", label: "Danish" },
  { code: "no", label: "Norwegian" },
  { code: "fi", label: "Finnish" },
]

const REGIONS: { code: string; label: string }[] = [
  { code: "",   label: "🌍 Any Region" },
  // Americas
  { code: "US", label: "🇺🇸 United States" },
  { code: "CA", label: "🇨🇦 Canada" },
  { code: "BR", label: "🇧🇷 Brazil" },
  { code: "MX", label: "🇲🇽 Mexico" },
  { code: "AR", label: "🇦🇷 Argentina" },
  { code: "CO", label: "🇨🇴 Colombia" },
  { code: "CL", label: "🇨🇱 Chile" },
  // Europe
  { code: "GB", label: "🇬🇧 United Kingdom" },
  { code: "IE", label: "🇮🇪 Ireland" },
  { code: "DE", label: "🇩🇪 Germany" },
  { code: "FR", label: "🇫🇷 France" },
  { code: "ES", label: "🇪🇸 Spain" },
  { code: "IT", label: "🇮🇹 Italy" },
  { code: "NL", label: "🇳🇱 Netherlands" },
  { code: "BE", label: "🇧🇪 Belgium" },
  { code: "PT", label: "🇵🇹 Portugal" },
  { code: "SE", label: "🇸🇪 Sweden" },
  { code: "NO", label: "🇳🇴 Norway" },
  { code: "DK", label: "🇩🇰 Denmark" },
  { code: "FI", label: "🇫🇮 Finland" },
  { code: "CH", label: "🇨🇭 Switzerland" },
  { code: "AT", label: "🇦🇹 Austria" },
  { code: "PL", label: "🇵🇱 Poland" },
  { code: "CZ", label: "🇨🇿 Czech Republic" },
  { code: "HU", label: "🇭🇺 Hungary" },
  { code: "RO", label: "🇷🇴 Romania" },
  { code: "GR", label: "🇬🇷 Greece" },
  { code: "TR", label: "🇹🇷 Turkey" },
  { code: "RU", label: "🇷🇺 Russia" },
  // Asia-Pacific
  { code: "AU", label: "🇦🇺 Australia" },
  { code: "NZ", label: "🇳🇿 New Zealand" },
  { code: "JP", label: "🇯🇵 Japan" },
  { code: "KR", label: "🇰🇷 South Korea" },
  { code: "CN", label: "🇨🇳 China" },
  { code: "HK", label: "🇭🇰 Hong Kong" },
  { code: "TW", label: "🇹🇼 Taiwan" },
  { code: "IN", label: "🇮🇳 India" },
  { code: "SG", label: "🇸🇬 Singapore" },
  { code: "TH", label: "🇹🇭 Thailand" },
  { code: "ID", label: "🇮🇩 Indonesia" },
  { code: "MY", label: "🇲🇾 Malaysia" },
  { code: "PH", label: "🇵🇭 Philippines" },
  { code: "VN", label: "🇻🇳 Vietnam" },
  { code: "PK", label: "🇵🇰 Pakistan" },
  // Middle East & Africa
  { code: "AE", label: "🇦🇪 UAE" },
  { code: "SA", label: "🇸🇦 Saudi Arabia" },
  { code: "IL", label: "🇮🇱 Israel" },
  { code: "ZA", label: "🇿🇦 South Africa" },
  { code: "NG", label: "🇳🇬 Nigeria" },
  { code: "EG", label: "🇪🇬 Egypt" },
]

export default function FilterPanel({ open, onClose, filters, onChange }: Props) {
  const [genres, setGenres] = useState<Genre[]>([])

  useEffect(() => {
    fetchGenres().then(setGenres).catch(console.error)
  }, [])

  const selectedDecades = filters.decades ?? []
  const decadeMin = selectedDecades.length ? Math.min(...selectedDecades) : null
  const decadeMax = selectedDecades.length ? Math.max(...selectedDecades) : null

  function set<K extends keyof Filters>(key: K, value: Filters[K]) {
    onChange({ ...filters, [key]: value })
  }

  function toggleGenre(id: number) {
    const current = filters.genre_ids ?? []
    if (current.includes(id)) {
      const next = current.filter(g => g !== id)
      set("genre_ids", next.length ? next : undefined)
    } else {
      set("genre_ids", [...current, id])
    }
  }

  function reset() {
    onChange({})
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-40 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="w-80 bg-zinc-900 h-full overflow-y-auto flex flex-col shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-zinc-700">
          <h2 className="text-white font-bold text-lg">Filters</h2>
          <div className="flex gap-3">
            <button onClick={reset} className="text-zinc-400 hover:text-white text-sm transition-colors">
              Reset
            </button>
            <button onClick={onClose} className="text-zinc-400 hover:text-white text-xl leading-none transition-colors">
              ✕
            </button>
          </div>
        </div>

        <div className="p-5 space-y-7 flex-1">

          {/* Sort */}
          <section>
            <label className="block text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-2">
              Sort By
            </label>
            <select
              value={filters.sort_by ?? "popularity.desc"}
              onChange={e => set("sort_by", e.target.value as Filters["sort_by"])}
              className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-500"
            >
              {SORT_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </section>

          {/* Region */}
          <section>
            <label className="block text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-2">
              Region
            </label>
            <select
              value={filters.region ?? ""}
              onChange={e => set("region", e.target.value || undefined)}
              className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-500"
            >
              {REGIONS.map(r => (
                <option key={r.code} value={r.code}>{r.label}</option>
              ))}
            </select>
            <p className="text-zinc-600 text-xs mt-1.5">
              Affects streaming availability and content ratings.
            </p>
          </section>

          {/* Language */}
          <section>
            <label className="block text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-2">
              Language
            </label>
            <select
              value={filters.language ?? ""}
              onChange={e => set("language", e.target.value || undefined)}
              className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-500"
            >
              {LANGUAGES.map(l => (
                <option key={l.code} value={l.code}>{l.label}</option>
              ))}
            </select>
            <p className="text-zinc-600 text-xs mt-1.5">
              Filters by original language of the film.
            </p>
          </section>

          {/* Genres */}
          {genres.length > 0 && (
            <section>
              <label className="block text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-2">
                Genres
              </label>
              <div className="flex flex-wrap gap-2">
                {genres.map(g => {
                  const active = (filters.genre_ids ?? []).includes(g.id)
                  return (
                    <button
                      key={g.id}
                      onClick={() => toggleGenre(g.id)}
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                        active
                          ? "bg-indigo-600 border-indigo-600 text-white"
                          : "bg-transparent border-zinc-600 text-zinc-300 hover:border-zinc-400"
                      }`}
                    >
                      {g.name}
                    </button>
                  )
                })}
              </div>
            </section>
          )}

          {/* Decades */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <label className="text-zinc-400 text-xs font-semibold uppercase tracking-wider">
                Decade
              </label>
              {decadeMin !== null && (
                <span className="text-indigo-400 text-xs">
                  {decadeMin === decadeMax ? `${decadeMin}s` : `${decadeMin}–${decadeMax! + 9}`}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {DECADES.map(d => {
                const active = decadeMin !== null && d >= decadeMin && d <= decadeMax!
                return (
                  <button
                    key={d}
                    onClick={() => {
                      if (decadeMin === null) {
                        set("decades", [d])
                        return
                      }
                      if (active) {
                        if (decadeMin === decadeMax) {
                          set("decades", undefined)
                        } else if (d === decadeMin) {
                          const idx = DECADES.indexOf(d)
                          set("decades", DECADES.filter(dec => dec >= DECADES[idx + 1] && dec <= decadeMax!))
                        } else if (d === decadeMax) {
                          const idx = DECADES.indexOf(d)
                          const next = DECADES.filter(dec => dec >= decadeMin! && dec <= DECADES[idx - 1])
                          set("decades", next.length ? next : undefined)
                        } else {
                          set("decades", [d])
                        }
                      } else {
                        const newMin = Math.min(decadeMin, d)
                        const newMax = Math.max(decadeMax!, d)
                        set("decades", DECADES.filter(dec => dec >= newMin && dec <= newMax))
                      }
                    }}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                      active
                        ? "bg-indigo-600 border-indigo-600 text-white"
                        : "bg-transparent border-zinc-600 text-zinc-300 hover:border-zinc-400"
                    }`}
                  >
                    {d}s
                  </button>
                )
              })}
            </div>
            {decadeMin !== null && decadeMin !== decadeMax && (
              <p className="text-zinc-600 text-xs mt-1.5">All decades in range are included.</p>
            )}
          </section>

          {/* Rating range */}
          <section>
            <label className="block text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-4">
              Rating
            </label>
            <RangeSlider
              min={0}
              max={10}
              step={0.5}
              value={[filters.rating_min ?? 0, filters.rating_max ?? 10]}
              onChange={([lo, hi]) => {
                onChange({
                  ...filters,
                  rating_min: lo > 0   ? lo : undefined,
                  rating_max: hi < 10  ? hi : undefined,
                })
              }}
              formatLabel={v => v.toFixed(1)}
            />
          </section>

          {/* Content rating */}
          <section>
            <label className="block text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-2">
              Content Rating
            </label>
            <p className="text-zinc-600 text-xs mb-3">
              Based on your selected region. No selection = any rating.
            </p>
            <div className="flex flex-wrap gap-2">
              {["G", "PG", "PG-13", "R", "NC-17"].map(r => {
                const included = (filters.content_rating_include ?? []).includes(r)
                return (
                  <button
                    key={r}
                    onClick={() => {
                      const current = filters.content_rating_include ?? []
                      const next = included
                        ? current.filter(x => x !== r)
                        : [...current, r]
                      set("content_rating_include", next.length ? next : undefined)
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                      included
                        ? "bg-violet-600 border-violet-600 text-white"
                        : "bg-transparent border-zinc-600 text-zinc-300 hover:border-zinc-400"
                    }`}
                  >
                    {r}
                  </button>
                )
              })}
            </div>
          </section>

          {/* Runtime */}
          <section>
            <label className="block text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-2">
              Max Runtime
            </label>
            <div className="flex gap-2">
              {[null, 90, 120, 150, 180].map(v => {
                const active = (filters.runtime_max ?? null) === v
                return (
                  <button
                    key={v ?? "any"}
                    onClick={() => set("runtime_max", v ?? undefined)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      active
                        ? "bg-indigo-600 border-indigo-600 text-white"
                        : "bg-transparent border-zinc-600 text-zinc-300 hover:border-zinc-400"
                    }`}
                  >
                    {v ? `${v}m` : "Any"}
                  </button>
                )
              })}
            </div>
          </section>

          {/* Streaming only */}
          <section>
            <label className="flex items-center gap-3 cursor-pointer">
              <div
                onClick={() => set("must_be_streaming", !filters.must_be_streaming)}
                className={`w-11 h-6 rounded-full transition-colors relative ${
                  filters.must_be_streaming ? "bg-indigo-600" : "bg-zinc-700"
                }`}
              >
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  filters.must_be_streaming ? "translate-x-5" : "translate-x-0.5"
                }`} />
              </div>
              <span className="text-zinc-300 text-sm">Streaming only</span>
            </label>
          </section>

        </div>

        <div className="p-5 border-t border-zinc-700">
          <button
            onClick={onClose}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-xl transition-colors"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  )
}
