const KEY = "filmdice_user_id"

export function getUserId(): string {
  if (typeof window === "undefined") return "ssr-placeholder"
  let id = localStorage.getItem(KEY)
  if (!id) {
    id = crypto.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
    localStorage.setItem(KEY, id)
  }
  return id
}
