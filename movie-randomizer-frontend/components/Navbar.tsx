"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import clsx from "clsx"

export default function Navbar() {
  const path = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-zinc-900/95 backdrop-blur border-t border-zinc-800 flex justify-around items-center h-16 px-4">
      <Link
        href="/"
        className={clsx(
          "flex flex-col items-center gap-0.5 text-xs font-medium transition-colors",
          path === "/" ? "text-indigo-400" : "text-zinc-500 hover:text-zinc-300",
        )}
      >
        <span className="text-xl">🎬</span>
        <span>Discover</span>
      </Link>
      <Link
        href="/watchlist"
        className={clsx(
          "flex flex-col items-center gap-0.5 text-xs font-medium transition-colors",
          path === "/watchlist" ? "text-indigo-400" : "text-zinc-500 hover:text-zinc-300",
        )}
      >
        <span className="text-xl">♥</span>
        <span>Liked</span>
      </Link>
    </nav>
  )
}
