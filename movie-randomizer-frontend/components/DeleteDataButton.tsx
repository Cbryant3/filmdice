"use client"

import { useState } from "react"
import { useSession, signOut } from "next-auth/react"
import { deleteUserData } from "@/lib/api"
import { peekGuestId, clearGuestId } from "@/lib/userId"

type Step = "idle" | "confirm" | "deleting" | "done" | "error"

// Two-step "Delete my data" control. Erases data for the signed-in account and
// for this browser's guest ID, then forgets the guest ID and signs out.
export default function DeleteDataButton() {
  const { data: session } = useSession()
  const [step, setStep] = useState<Step>("idle")

  async function handleDelete() {
    setStep("deleting")
    const ids = new Set<string>()
    if (session?.user?.id) ids.add(session.user.id)
    const guest = peekGuestId()
    if (guest) ids.add(guest)

    try {
      await Promise.all([...ids].map(id => deleteUserData(id)))
      clearGuestId()
      setStep("done")
      if (session) await signOut({ redirect: false })
    } catch {
      setStep("error")
    }
  }

  if (step === "done") {
    return (
      <div className="rounded-xl bg-emerald-950/50 border border-emerald-800 px-4 py-3 text-emerald-200 text-sm">
        Your data has been deleted{session ? " and you've been signed out" : ""}. If you keep using FilmDice,
        it will start fresh.
      </div>
    )
  }

  if (step === "confirm" || step === "deleting") {
    return (
      <div className="rounded-xl bg-red-950/40 border border-red-900 p-4 space-y-3">
        <p className="text-red-100 text-sm">
          This permanently erases your liked and watched lists, swipe history, and taste profile
          {session ? " for your account and this browser" : " for this browser"}. It can&apos;t be undone.
        </p>
        <div className="flex gap-3">
          <button
            onClick={handleDelete}
            disabled={step === "deleting"}
            className="bg-red-600 hover:bg-red-500 disabled:opacity-60 text-white px-5 py-2 rounded-full text-sm font-medium transition-colors"
          >
            {step === "deleting" ? "Deleting…" : "Yes, delete everything"}
          </button>
          <button
            onClick={() => setStep("idle")}
            disabled={step === "deleting"}
            className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-5 py-2 rounded-full text-sm font-medium transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <button
        onClick={() => setStep("confirm")}
        className="bg-zinc-800 hover:bg-red-900/60 border border-zinc-700 hover:border-red-800 text-red-300 px-5 py-2 rounded-full text-sm font-medium transition-colors"
      >
        Delete my data
      </button>
      {step === "error" && (
        <p className="text-red-300 text-sm">
          Couldn&apos;t reach the server. It may be waking up, so try again in a minute.
        </p>
      )}
    </div>
  )
}
