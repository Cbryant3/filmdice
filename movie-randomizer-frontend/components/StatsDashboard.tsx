"use client"

import { useEffect, useState } from "react"
import type { PublicStats } from "@/lib/types"
import { fetchStats } from "@/lib/api"

type Load = { state: "loading"; slow: boolean } | { state: "error" } | { state: "ready"; data: PublicStats }

const fmt = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 })
const num = (n: number | null | undefined) => (n == null ? "—" : n < 10_000 ? n.toLocaleString("en-US") : fmt.format(n))
const pct = (r: number | null | undefined) => (r == null ? "—" : `${Math.round(r * 100)}%`)

const FILTER_LABELS: Record<string, string> = {
  genre: "Genre", decade: "Decade / year", rating: "Rating", runtime: "Runtime",
  content_rating: "Content rating", language: "Language", region: "Region",
  streaming_only: "Streaming only", sort: "Sort order",
}

export default function StatsDashboard() {
  const [load, setLoad] = useState<Load>({ state: "loading", slow: false })

  useEffect(() => {
    let cancelled = false
    const slowTimer = setTimeout(() => {
      if (!cancelled) setLoad(l => (l.state === "loading" ? { state: "loading", slow: true } : l))
    }, 4000)
    fetchStats()
      .then(data => { if (!cancelled) setLoad({ state: "ready", data }) })
      .catch(() => { if (!cancelled) setLoad({ state: "error" }) })
      .finally(() => clearTimeout(slowTimer))
    return () => { cancelled = true; clearTimeout(slowTimer) }
  }, [])

  if (load.state === "loading") {
    return (
      <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-6 text-center">
        <div className="mx-auto mb-3 h-6 w-6 rounded-full border-2 border-zinc-700 border-t-indigo-400 animate-spin" />
        <p className="text-zinc-300 text-sm">Loading live stats…</p>
        {load.slow && (
          <p className="text-zinc-500 text-xs mt-2">
            The server sleeps when it&apos;s quiet. Waking it up can take up to a minute.
          </p>
        )}
      </div>
    )
  }

  if (load.state === "error") {
    return (
      <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-6 text-center">
        <p className="text-zinc-300 text-sm">Couldn&apos;t load stats right now.</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-3 bg-zinc-800 hover:bg-zinc-700 text-white px-5 py-2 rounded-full text-sm font-medium"
        >
          Try again
        </button>
      </div>
    )
  }

  const s = load.data
  const since = s.tracking_since
    ? new Date(s.tracking_since + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : null

  return (
    <div className="space-y-10">
      <p className="text-zinc-500 text-xs">
        Updated {new Date(s.generated_at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
        {since && <> · Daily tracking since {since}</>}
      </p>

      {/* Users & activity */}
      <Block title="Users & activity">
        <Tiles>
          <Tile label="Total users" value={num(s.users.total)} hint={`${num(s.users.signed_in)} signed in · ${num(s.users.guests)} guests`} hero />
          <Tile label="Active in last 7 days" value={num(s.users.active_7d)} />
          <Tile label="Active in last 30 days" value={num(s.users.active_30d)} />
          <Tile label="Returning users" value={num(s.users.returning)} hint="Came back on another day" />
          <Tile label="Avg swipes per user" value={num(s.users.avg_swipes_per_user)} />
        </Tiles>
      </Block>

      {/* Swipes */}
      <Block title="Swipes">
        <Tiles>
          <Tile label="Total swipes" value={num(s.swipes.total)} hero />
          <Tile label="Likes" value={num(s.swipes.likes)} />
          <Tile label="Skips" value={num(s.swipes.skips)} />
          <Tile label="Marked watched" value={num(s.swipes.watched)} />
          <Tile label="Like rate" value={pct(s.swipes.like_rate)} hint="Share of swipes that were likes" />
          <Tile label="Movies served" value={num(s.swipes.movies_served)} hint="Unique user–movie pairs" />
        </Tiles>
      </Block>

      {/* Trends */}
      <Block title="Last 30 days" note="Collected from the day tracking started.">
        <ColumnChart title="Swipes per day" data={s.series.map(d => ({ label: d.day, value: d.swipes }))} />
        <ColumnChart title="Movies rolled per day" data={s.series.map(d => ({ label: d.day, value: d.rolls }))} />
        <ColumnChart title="New users per day" data={s.series.map(d => ({ label: d.day, value: d.new_users }))} />
        <details className="text-sm">
          <summary className="cursor-pointer text-indigo-400 hover:text-indigo-300 text-xs">Show as table</summary>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-xs text-zinc-300">
              <thead className="text-zinc-500">
                <tr><th className="py-1 pr-3 font-medium">Day</th><th className="pr-3 font-medium">Rolls</th><th className="pr-3 font-medium">Swipes</th><th className="pr-3 font-medium">Likes</th><th className="font-medium">New users</th></tr>
              </thead>
              <tbody>
                {[...s.series].reverse().map(d => (
                  <tr key={d.day} className="border-t border-zinc-800">
                    <td className="py-1 pr-3">{shortDay(d.day)}</td><td className="pr-3">{d.rolls}</td><td className="pr-3">{d.swipes}</td><td className="pr-3">{d.likes}</td><td>{d.new_users}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </Block>

      {/* For You */}
      <Block title="⭐ For You recommendations" note="How often personalized picks get liked, compared with fully random cards.">
        <Tiles>
          <Tile label="For You cards shown" value={num(s.for_you.shown)} />
          <Tile label="For You likes" value={num(s.for_you.likes)} />
        </Tiles>
        <CompareBars
          rows={[
            { label: "For You picks", value: s.for_you.like_rate, accent: true },
            { label: "Random picks", value: s.for_you.random_like_rate, accent: false },
          ]}
        />
        {s.for_you.swipes < 20 && (
          <p className="text-zinc-500 text-xs">Early numbers: based on {s.for_you.swipes} For You swipe{s.for_you.swipes === 1 ? "" : "s"} so far.</p>
        )}
      </Block>

      {/* Taste */}
      <Block title="What people like">
        <HBarList title="Top genres (by likes)" rows={s.taste.top_genres.map(g => ({ label: g.genre, value: g.likes }))} />
        <HBarList title="Favorite decades (by likes)" rows={s.taste.top_decades.map(d => ({ label: `${d.decade}s`, value: d.likes }))} />
        {s.taste.top_movies.length > 0 ? (
          <div>
            <h4 className="text-zinc-300 text-sm font-medium mb-3">Most-liked movies</h4>
            <ol className="space-y-2">
              {s.taste.top_movies.map((m, i) => (
                <li key={m.id} className="flex items-center gap-3 rounded-xl bg-zinc-900 border border-zinc-800 p-2 pr-4">
                  {m.poster_url
                    ? <img src={m.poster_url} alt="" className="w-9 h-[54px] rounded object-cover" />
                    : <div className="w-9 h-[54px] rounded bg-zinc-800" />}
                  <span className="text-zinc-500 text-xs w-4">{i + 1}</span>
                  <span className="flex-1 text-sm text-zinc-200">{m.title ?? "Unknown"}{m.year && <span className="text-zinc-500"> ({m.year})</span>}</span>
                  <span className="text-zinc-400 text-xs whitespace-nowrap">{m.likes} likes</span>
                </li>
              ))}
            </ol>
          </div>
        ) : (
          <p className="text-zinc-500 text-xs">Most-liked movies appear once a movie is liked by at least two people.</p>
        )}
      </Block>

      {/* Filters & engagement */}
      <Block title="How people use FilmDice">
        <Tiles>
          <Tile label="Rolls using filters" value={pct(s.filters.rolls_with_filters_rate)} />
          <Tile label="Trailer plays" value={num(s.engagement.trailer_plays)} />
          <Tile label="“Where to watch” taps" value={num(s.engagement.watch_link_taps)} />
        </Tiles>
        <HBarList
          title="Filters used (rolls)"
          rows={s.filters.usage.filter(f => f.rolls > 0).map(f => ({ label: FILTER_LABELS[f.filter] ?? f.filter, value: f.rolls }))}
          empty="No filtered rolls yet."
        />
      </Block>

      {/* Engine & health */}
      <Block title="Engine & health" note="Health numbers reset when the server restarts or wakes from sleep.">
        <Tiles>
          <Tile label="Median response" value={s.health.latency_ms_p50 == null ? "—" : `${Math.round(s.health.latency_ms_p50)} ms`} />
          <Tile label="95th percentile" value={s.health.latency_ms_p95 == null ? "—" : `${Math.round(s.health.latency_ms_p95)} ms`} />
          <Tile label="Server error rate" value={s.health.error_rate == null ? "—" : `${(s.health.error_rate * 100).toFixed(1)}%`} />
          <Tile label="Requests since restart" value={num(s.health.requests)} />
          <Tile label="TMDB API calls since restart" value={num(s.health.tmdb_calls)} />
          <Tile label="Up for" value={duration(s.health.uptime_seconds)} />
          <Tile label="“No movies found” rate" value={pct(s.engine.no_results_rate)} />
          <Tile label="Avg tries per pick" value={num(s.engine.avg_rerolls_per_pick)} hint="Random picks needed to find a fresh match" />
        </Tiles>
      </Block>

      <p className="text-zinc-500 text-xs leading-relaxed">
        All numbers are anonymous totals. No individual&apos;s activity is shown, and movies only
        appear in &ldquo;most-liked&rdquo; once two or more people like them. See the{" "}
        <a href="/privacy" className="text-indigo-400 hover:text-indigo-300">Privacy Policy</a>.
      </p>
    </div>
  )
}

/* ---------------- building blocks ---------------- */

function Block({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-indigo-300 text-xs font-semibold uppercase tracking-wider">{title}</h2>
        {note && <p className="text-zinc-500 text-xs mt-1">{note}</p>}
      </div>
      {children}
    </section>
  )
}

function Tiles({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">{children}</div>
}

function Tile({ label, value, hint, hero = false }: { label: string; value: string; hint?: string; hero?: boolean }) {
  return (
    <div className={`rounded-xl bg-zinc-900 border border-zinc-800 p-3 ${hero ? "col-span-2 sm:col-span-1" : ""}`}>
      <p className="text-zinc-400 text-xs">{label}</p>
      <p className={`text-white font-semibold tabular-nums mt-1 ${hero ? "text-3xl" : "text-xl"}`}>{value}</p>
      {hint && <p className="text-zinc-500 text-[11px] mt-1 leading-snug">{hint}</p>}
    </div>
  )
}

function shortDay(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function duration(sec: number) {
  if (sec < 60) return `${sec}s`
  const m = Math.floor(sec / 60)
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  if (h < 48) return `${h} hr`
  return `${Math.floor(h / 24)} days`
}

// Single-series column chart: one baseline, thin rounded-top columns, hover tooltip.
function ColumnChart({ title, data }: { title: string; data: { label: string; value: number }[] }) {
  const [hover, setHover] = useState<number | null>(null)
  const max = Math.max(1, ...data.map(d => d.value))
  const niceMax = niceCeil(max)
  const total = data.reduce((a, d) => a + d.value, 0)
  const active = hover ?? data.length - 1
  return (
    <figure className="rounded-xl bg-zinc-900 border border-zinc-800 p-4">
      <figcaption className="flex items-baseline justify-between gap-3 mb-3">
        <span className="text-zinc-300 text-sm font-medium">{title}</span>
        <span className="text-zinc-500 text-xs tabular-nums">
          {hover == null
            ? <>{total.toLocaleString("en-US")} total</>
            : <><span className="text-zinc-200">{data[active].value.toLocaleString("en-US")}</span> on {shortDay(data[active].label)}</>}
        </span>
      </figcaption>
      <div className="relative h-28 mt-4" onMouseLeave={() => setHover(null)}>
        {/* recessive gridline at the top value */}
        <div className="absolute inset-x-0 top-0 border-t border-zinc-800" />
        <span className="absolute left-0 top-1 text-[10px] text-zinc-600 tabular-nums">{niceMax}</span>
        <div className="absolute inset-0 flex items-end gap-[2px] border-b border-zinc-700">
          {data.map((d, i) => (
            <button
              key={d.label}
              type="button"
              aria-label={`${shortDay(d.label)}: ${d.value}`}
              onMouseEnter={() => setHover(i)}
              onFocus={() => setHover(i)}
              onClick={() => setHover(i)}
              className="relative flex-1 h-full flex items-end justify-center focus:outline-none"
            >
              <span
                className={`block w-full max-w-[12px] rounded-t-[4px] transition-colors ${
                  hover === i ? "bg-indigo-300" : "bg-indigo-400"
                }`}
                style={{ height: d.value ? `${Math.max(2, (d.value / niceMax) * 100)}%` : 0 }}
              />
            </button>
          ))}
        </div>
      </div>
      <div className="flex justify-between mt-1.5 text-[10px] text-zinc-600">
        <span>{shortDay(data[0].label)}</span>
        <span>{shortDay(data[data.length - 1].label)}</span>
      </div>
    </figure>
  )
}

function niceCeil(n: number) {
  if (n <= 5) return 5
  const p = Math.pow(10, Math.floor(Math.log10(n)))
  for (const m of [1, 2, 2.5, 5, 10]) if (m * p >= n) return m * p
  return 10 * p
}

// Horizontal bar list: one series, value at each bar tip.
function HBarList({ title, rows, empty = "Not enough data yet." }: { title: string; rows: { label: string; value: number }[]; empty?: string }) {
  const max = Math.max(1, ...rows.map(r => r.value))
  return (
    <div>
      <h4 className="text-zinc-300 text-sm font-medium mb-3">{title}</h4>
      {rows.length === 0 ? (
        <p className="text-zinc-500 text-xs">{empty}</p>
      ) : (
        <ul className="space-y-2">
          {rows.map(r => (
            <li key={r.label} className="grid grid-cols-[7.5rem_1fr] items-center gap-3">
              <span className="text-zinc-400 text-xs truncate">{r.label}</span>
              <span className="flex items-center gap-2">
                <span className="h-3 rounded-r-[4px] bg-indigo-400" style={{ width: `${Math.max(2, (r.value / max) * 85)}%` }} />
                <span className="text-zinc-300 text-xs tabular-nums">{r.value.toLocaleString("en-US")}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// Two rates on a shared 0–100% scale, both direct-labeled.
function CompareBars({ rows }: { rows: { label: string; value: number | null; accent: boolean }[] }) {
  return (
    <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4 space-y-3">
      <p className="text-zinc-300 text-sm font-medium">Like rate</p>
      {rows.map(r => (
        <div key={r.label} className="grid grid-cols-[6.5rem_1fr] items-center gap-3">
          <span className="text-zinc-400 text-xs">{r.label}</span>
          <span className="flex items-center gap-2">
            <span className="relative h-3 flex-1 rounded-[4px] bg-zinc-800 overflow-hidden">
              <span
                className={`absolute inset-y-0 left-0 rounded-r-[4px] ${r.accent ? "bg-indigo-400" : "bg-zinc-500"}`}
                style={{ width: r.value == null ? 0 : `${Math.max(1, r.value * 100)}%` }}
              />
            </span>
            <span className="text-zinc-200 text-xs tabular-nums w-9 text-right">{pct(r.value)}</span>
          </span>
        </div>
      ))}
    </div>
  )
}
