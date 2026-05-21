"use client"

import { useEffect } from "react"

interface Props {
  trailerUrl: string
  onClose: () => void
}

function youtubeEmbedUrl(url: string): string {
  const match = url.match(/[?&]v=([^&]+)/)
  if (match) return `https://www.youtube.com/embed/${match[1]}?autoplay=1`
  return url
}

export default function TrailerModal({ trailerUrl, onClose }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl aspect-video mx-4"
        onClick={e => e.stopPropagation()}
      >
        <iframe
          src={youtubeEmbedUrl(trailerUrl)}
          className="w-full h-full rounded-xl"
          allow="autoplay; encrypted-media"
          allowFullScreen
        />
        <button
          onClick={onClose}
          className="absolute -top-10 right-0 text-white/70 hover:text-white text-sm font-medium"
        >
          ✕ Close
        </button>
      </div>
    </div>
  )
}
