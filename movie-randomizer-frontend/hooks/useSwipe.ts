"use client"

import { useRef, useState, useCallback } from "react"

const SWIPE_THRESHOLD = 100  // px before we commit to a swipe
const ROT_FACTOR = 0.08       // degrees per px of horizontal drag

export type SwipeDirection = "left" | "right" | "up"

interface DragState {
  startX: number
  startY: number
  isDragging: boolean
}

export function useSwipe(onSwipe: (dir: SwipeDirection) => void) {
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [flying, setFlying] = useState<SwipeDirection | null>(null)
  const drag = useRef<DragState>({ startX: 0, startY: 0, isDragging: false })

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    drag.current = { startX: e.clientX, startY: e.clientY, isDragging: true }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }, [])

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!drag.current.isDragging) return
    setOffset({
      x: e.clientX - drag.current.startX,
      y: e.clientY - drag.current.startY,
    })
  }, [])

  const onPointerUp = useCallback(() => {
    if (!drag.current.isDragging) return
    drag.current.isDragging = false

    const { x, y } = offset
    const isUpDominant = Math.abs(y) > Math.abs(x) && y < -SWIPE_THRESHOLD

    if (isUpDominant) {
      setFlying("up")
      setTimeout(() => {
        setFlying(null)
        setOffset({ x: 0, y: 0 })
        onSwipe("up")
      }, 350)
    } else if (Math.abs(x) >= SWIPE_THRESHOLD) {
      const dir: SwipeDirection = x > 0 ? "right" : "left"
      setFlying(dir)
      setTimeout(() => {
        setFlying(null)
        setOffset({ x: 0, y: 0 })
        onSwipe(dir)
      }, 350)
    } else {
      setOffset({ x: 0, y: 0 })
    }
  }, [offset, onSwipe])

  const rotation = offset.x * ROT_FACTOR
  const opacity = flying
    ? 0
    : Math.max(0, 1 - Math.abs(offset.x) / (SWIPE_THRESHOLD * 3))

  const style: React.CSSProperties = {
    transform: flying
      ? flying === "up"
        ? "translateY(-150%)"
        : `translateX(${flying === "right" ? "120vw" : "-120vw"}) rotate(${flying === "right" ? 30 : -30}deg)`
      : `translate(${offset.x}px, ${offset.y}px) rotate(${rotation}deg)`,
    opacity,
    transition: flying || (!drag.current.isDragging && offset.x === 0 && offset.y === 0)
      ? "transform 0.35s ease, opacity 0.35s ease"
      : "none",
    cursor: drag.current.isDragging ? "grabbing" : "grab",
    userSelect: "none",
  }

  const triggerSwipe = useCallback((dir: SwipeDirection) => {
    setFlying(dir)
    setTimeout(() => {
      setFlying(null)
      setOffset({ x: 0, y: 0 })
      onSwipe(dir)
    }, 350)
  }, [onSwipe])

  const isHorizontal = Math.abs(offset.x) >= Math.abs(offset.y)
  const likeIndicator    = isHorizontal ? Math.min(1, Math.max(0,  offset.x / SWIPE_THRESHOLD)) : 0
  const nopeIndicator    = isHorizontal ? Math.min(1, Math.max(0, -offset.x / SWIPE_THRESHOLD)) : 0
  const watchedIndicator = !isHorizontal ? Math.min(1, Math.max(0, -offset.y / SWIPE_THRESHOLD)) : 0

  return {
    style,
    likeIndicator,
    nopeIndicator,
    watchedIndicator,
    triggerSwipe,
    handlers: { onPointerDown, onPointerMove, onPointerUp },
  }
}
