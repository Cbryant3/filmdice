"use client"

import { useRef } from "react"

interface Props {
  min: number
  max: number
  step?: number
  value: [number, number]
  onChange: (value: [number, number]) => void
  formatLabel?: (v: number) => string
}

export default function RangeSlider({
  min, max, step = 0.5, value, onChange, formatLabel,
}: Props) {
  const trackRef = useRef<HTMLDivElement>(null)

  function snapToStep(raw: number) {
    const decimals = step < 1 ? (String(step).split(".")[1]?.length ?? 0) : 0
    return parseFloat((Math.round(raw / step) * step).toFixed(decimals))
  }

  function valueFromClientX(clientX: number): number {
    const track = trackRef.current
    if (!track) return min
    const { left, width } = track.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (clientX - left) / width))
    return snapToStep(min + ratio * (max - min))
  }

  function makeHandleProps(handle: "low" | "high") {
    return {
      onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
        e.preventDefault()
        e.currentTarget.setPointerCapture(e.pointerId)
      },
      onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
        if (!e.currentTarget.hasPointerCapture(e.pointerId)) return
        const next = valueFromClientX(e.clientX)
        if (handle === "low") {
          onChange([Math.min(next, value[1] - step), value[1]])
        } else {
          onChange([value[0], Math.max(next, value[0] + step)])
        }
      },
      onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
        e.currentTarget.releasePointerCapture(e.pointerId)
      },
    }
  }

  const lowPct  = ((value[0] - min) / (max - min)) * 100
  const highPct = ((value[1] - min) / (max - min)) * 100
  const fmt = formatLabel ?? ((v: number) => String(v))
  const isFullRange = value[0] === min && value[1] === max

  return (
    <div className="px-1">
      {/* Value labels */}
      <div className="flex justify-between mb-4">
        <span className={`text-sm font-semibold ${isFullRange ? "text-zinc-500" : "text-amber-400"}`}>
          {isFullRange ? "Any" : `★ ${fmt(value[0])}`}
        </span>
        <span className={`text-sm font-semibold ${isFullRange ? "text-zinc-500" : "text-amber-400"}`}>
          {isFullRange ? "rating" : `★ ${fmt(value[1])}`}
        </span>
      </div>

      {/* Track */}
      <div ref={trackRef} className="relative h-1.5 rounded-full bg-zinc-700 mx-2.5">
        {/* Active fill */}
        <div
          className="absolute h-full rounded-full bg-amber-500 transition-none"
          style={{ left: `${lowPct}%`, width: `${highPct - lowPct}%` }}
        />

        {/* Low handle */}
        <div
          {...makeHandleProps("low")}
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-white border-2 border-amber-500 shadow-md cursor-grab active:cursor-grabbing touch-none select-none hover:scale-110 transition-transform"
          style={{ left: `${lowPct}%` }}
        />

        {/* High handle */}
        <div
          {...makeHandleProps("high")}
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-white border-2 border-amber-500 shadow-md cursor-grab active:cursor-grabbing touch-none select-none hover:scale-110 transition-transform"
          style={{ left: `${highPct}%` }}
        />
      </div>

      {/* Min / max scale */}
      <div className="flex justify-between mt-3 text-zinc-600 text-xs px-0.5">
        <span>{fmt(min)}</span>
        <span>{fmt(max)}</span>
      </div>
    </div>
  )
}
