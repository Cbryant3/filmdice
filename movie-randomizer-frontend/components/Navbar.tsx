"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession, signIn, signOut } from "next-auth/react"
import clsx from "clsx"

export default function Navbar() {
  const path = usePathname()
  const { data: session } = useSession()

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

      {session ? (
        <button
          onClick={() => signOut()}
          className="flex flex-col items-center gap-0.5 text-xs font-medium text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          {session.user?.image ? (
            <img
              src={session.user.image}
              alt={session.user.name ?? "Account"}
              className="w-6 h-6 rounded-full object-cover"
            />
          ) : (
            <span className="text-xl">👤</span>
          )}
          <span>Sign Out</span>
        </button>
      ) : (
        <button
          onClick={() => signIn("google")}
          className="flex flex-col items-center gap-0.5 text-xs font-medium text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <span className="text-xl">👤</span>
          <span>Sign In</span>
        </button>
      )}
    </nav>
  )
}
