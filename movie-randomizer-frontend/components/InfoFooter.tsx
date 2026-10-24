import Link from "next/link"
import { CREATOR } from "@/lib/site"

// Contact card + cross-links + required third-party attributions.
// Shown at the bottom of the FAQ and Privacy pages.
export default function InfoFooter() {
  return (
    <footer className="mt-12 space-y-6">
      <section id="contact" className="rounded-2xl bg-zinc-900 border border-zinc-800 p-5 scroll-mt-6">
        <h2 className="text-white font-bold text-lg">Contact</h2>
        <p className="text-zinc-400 text-sm mt-1">
          FilmDice is built and maintained by <span className="text-zinc-200">{CREATOR.name}</span>,{" "}
          {CREATOR.location}. Questions, bug reports, and feedback are welcome.
        </p>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          <ContactLink href={`mailto:${CREATOR.email}`} label="Email" value={CREATOR.email} />
          <ContactLink href={CREATOR.linkedin} label="LinkedIn" value="cameron-g-bryant" external />
          <ContactLink href={CREATOR.github} label="GitHub" value="Cbryant3" external />
          <ContactLink href={CREATOR.repo} label="Source code" value="Cbryant3/filmdice" external />
        </ul>
      </section>

      <nav className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
        <Link href="/faq" className="text-indigo-400 hover:text-indigo-300">FAQ</Link>
        <Link href="/about" className="text-indigo-400 hover:text-indigo-300">About me</Link>
        <Link href="/privacy" className="text-indigo-400 hover:text-indigo-300">Privacy Policy</Link>
        <Link href="/privacy#your-data" className="text-indigo-400 hover:text-indigo-300">Delete my data</Link>
        <Link href="/faq#credits" className="text-indigo-400 hover:text-indigo-300">Credits</Link>
      </nav>

      <section id="credits" className="rounded-2xl bg-zinc-900 border border-zinc-800 p-5 scroll-mt-6">
        <h2 className="text-white font-bold text-lg">Credits &amp; thanks</h2>
        <div className="text-zinc-400 text-sm mt-2 leading-relaxed space-y-3">
          <p>
            A huge thank you to{" "}
            <a href="https://www.themoviedb.org" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300">
              The Movie Database (TMDB)
            </a>
            . Every title, poster, overview, rating, and trailer link in FilmDice comes from
            TMDB&apos;s community-built database and their free developer API. This app
            wouldn&apos;t exist without them.
          </p>
          <p>
            FilmDice uses TMDB data in line with TMDB&apos;s{" "}
            <a href="https://www.themoviedb.org/api-terms-of-use" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300">
              API Terms of Use
            </a>{" "}
            and{" "}
            <a href="https://www.themoviedb.org/about/logos-attribution" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300">
              attribution guidelines
            </a>
            . FilmDice is a free, non-commercial project.
          </p>
          <p className="text-zinc-200 font-medium">
            This product uses the TMDB API but is not endorsed or certified by TMDB.
          </p>
          <p>
            Streaming availability (&ldquo;Where to watch&rdquo;) is provided by{" "}
            <a href="https://www.justwatch.com" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300">
              JustWatch
            </a>{" "}
            through TMDB. Trailers play from YouTube.
          </p>
        </div>
      </section>
    </footer>
  )
}

function ContactLink({
  href, label, value, external = false,
}: { href: string; label: string; value: string; external?: boolean }) {
  return (
    <li>
      <a
        href={href}
        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        className="flex flex-col rounded-xl bg-zinc-800/60 hover:bg-zinc-800 px-4 py-3 transition-colors"
      >
        <span className="text-zinc-500 text-xs font-semibold uppercase tracking-wider">{label}</span>
        <span className="text-zinc-100 text-sm break-all">{value}</span>
      </a>
    </li>
  )
}
