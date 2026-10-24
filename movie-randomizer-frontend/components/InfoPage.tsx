import type { ReactNode } from "react"
import InfoFooter from "@/components/InfoFooter"

// Shared scrolling layout for text pages (FAQ, Privacy). Bottom padding clears
// the fixed navbar.
export default function InfoPage({
  title, intro, children,
}: { title: string; intro?: ReactNode; children: ReactNode }) {
  return (
    <main className="flex-1 bg-zinc-950 px-5 pt-6 pb-28">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-white text-2xl font-black tracking-tight">
          Film<span className="text-indigo-400">Dice</span>{" "}
          <span className="text-zinc-400 font-bold">· {title}</span>
        </h1>
        {intro && <div className="text-zinc-400 text-sm mt-2 leading-relaxed">{intro}</div>}
        <div className="mt-8">{children}</div>
        <InfoFooter />
      </div>
    </main>
  )
}

export function Section({ id, title, children }: { id?: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="mb-10 scroll-mt-6">
      <h2 className="text-indigo-300 text-xs font-semibold uppercase tracking-wider mb-3">{title}</h2>
      <div className="space-y-2">{children}</div>
    </section>
  )
}

// Collapsible question using native <details>, so it works without JavaScript.
export function QA({ q, children }: { q: string; children: ReactNode }) {
  return (
    <details className="group rounded-xl bg-zinc-900 border border-zinc-800 open:border-zinc-700">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 text-white text-sm font-medium [&::-webkit-details-marker]:hidden">
        {q}
        <span className="text-zinc-500 transition-transform group-open:rotate-45 text-lg leading-none">+</span>
      </summary>
      <div className="px-4 pb-4 text-zinc-400 text-sm leading-relaxed space-y-2">{children}</div>
    </details>
  )
}

export function Prose({ children }: { children: ReactNode }) {
  return <div className="text-zinc-400 text-sm leading-relaxed space-y-3 [&_strong]:text-zinc-200 [&_a]:text-indigo-400 [&_a:hover]:text-indigo-300 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1">{children}</div>
}
