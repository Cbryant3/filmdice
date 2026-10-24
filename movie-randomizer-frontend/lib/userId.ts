const KEY = "filmdice_user_id"

/** The browser's guest ID if one exists, without creating a new one. */
export function peekGuestId(): string | null {
  if (typeof window === "undefined") return null
  try { return localStorage.getItem(KEY) } catch { return null }
}

/** Forget the guest ID so the next visit starts fresh. */
export function clearGuestId(): void {
  try { localStorage.removeItem(KEY) } catch { /* storage unavailable */ }
}

export function getUserId(): string {
  if (typeof window === "undefined") return "ssr-placeholder"
  let id = localStorage.getItem(KEY)
  if (!id) {
    id = crypto.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
    localStorage.setItem(KEY, id)
  }
  return id
}
