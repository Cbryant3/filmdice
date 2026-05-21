"use client"

import { useEffect, useState } from "react"

// Dot positions as [cx%, cy%] for each face value
const DOTS: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [[27, 27], [73, 73]],
  3: [[27, 27], [50, 50], [73, 73]],
  4: [[27, 27], [73, 27], [27, 73], [73, 73]],
  5: [[27, 27], [73, 27], [50, 50], [27, 73], [73, 73]],
  6: [[27, 22], [73, 22], [27, 50], [73, 50], [27, 78], [73, 78]],
}

function DieFace({ value, style }: { value: number; style?: React.CSSProperties }) {
  const dots = DOTS[value] ?? DOTS[1]
  return (
    <svg
      viewBox="0 0 100 100"
      width={72}
      height={72}
      style={style}
      className="drop-shadow-2xl"
    >
      <rect x="4" y="4" width="92" height="92" rx="18" fill="white" />
      {/* Subtle inner shadow border */}
      <rect x="4" y="4" width="92" height="92" rx="18" fill="none"
        stroke="rgba(0,0,0,0.08)" strokeWidth="2" />
      {dots.map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r="9" fill="#18181b" />
      ))}
    </svg>
  )
}

function playDiceSound() {
  try {
    const AudioContext = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof window.AudioContext }).webkitAudioContext
    if (!AudioContext) return
    const ctx = new AudioContext()

    // Simulate multiple impacts that get slower and quieter as dice settle
    const impacts = [0, 0.07, 0.15, 0.25, 0.37, 0.46, 0.54, 0.61, 0.67, 0.72, 0.76]

    impacts.forEach((time, i) => {
      const volume = Math.max(0.04, 0.35 * Math.exp(-i * 0.28))
      const sampleCount = Math.floor(ctx.sampleRate * 0.028)
      const buffer = ctx.createBuffer(1, sampleCount, ctx.sampleRate)
      const data = buffer.getChannelData(0)
      for (let j = 0; j < sampleCount; j++) data[j] = Math.random() * 2 - 1

      const source = ctx.createBufferSource()
      source.buffer = buffer

      const filter = ctx.createBiquadFilter()
      filter.type = "bandpass"
      filter.frequency.value = 1000 + Math.random() * 600
      filter.Q.value = 1.8

      const gain = ctx.createGain()
      const t = ctx.currentTime + time
      gain.gain.setValueAtTime(0, t)
      gain.gain.linearRampToValueAtTime(volume, t + 0.003)
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.028)

      source.connect(filter)
      filter.connect(gain)
      gain.connect(ctx.destination)
      source.start(t)
      source.stop(t + 0.04)
    })

    setTimeout(() => ctx.close(), 2500)
  } catch {
    // Audio unavailable — fail silently
  }
}

const ANIM_DURATION = 1300 // ms

export default function DiceLoader() {
  const [face1, setFace1] = useState(6)
  const [face2, setFace2] = useState(3)
  const [settled, setSettled] = useState(false)

  useEffect(() => {
    playDiceSound()

    // Cycle faces rapidly while rolling
    const interval = setInterval(() => {
      setFace1(Math.ceil(Math.random() * 6))
      setFace2(Math.ceil(Math.random() * 6))
    }, 90)

    // Settle on final values
    const timeout = setTimeout(() => {
      clearInterval(interval)
      setFace1(Math.ceil(Math.random() * 6))
      setFace2(Math.ceil(Math.random() * 6))
      setSettled(true)
    }, ANIM_DURATION)

    return () => {
      clearInterval(interval)
      clearTimeout(timeout)
    }
  }, [])

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex items-center gap-5">
        <DieFace
          value={face1}
          style={{
            animation: `diceRoll1 ${ANIM_DURATION}ms ease-out forwards`,
            opacity: settled ? 1 : undefined,
          }}
        />
        <DieFace
          value={face2}
          style={{
            animation: `diceRoll2 ${ANIM_DURATION}ms ease-out forwards`,
            opacity: settled ? 1 : undefined,
          }}
        />
      </div>
      <p className="text-zinc-500 text-sm tracking-wide animate-pulse">
        Finding your next watch…
      </p>
    </div>
  )
}
