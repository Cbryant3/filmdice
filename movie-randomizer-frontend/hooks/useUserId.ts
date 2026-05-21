"use client"

import { useSession } from "next-auth/react"
import { getUserId } from "@/lib/userId"

export function useUserId(): { userId: string; loading: boolean } {
  const { data: session, status } = useSession()
  return {
    userId: session?.user?.id ?? getUserId(),
    loading: status === "loading",
  }
}
