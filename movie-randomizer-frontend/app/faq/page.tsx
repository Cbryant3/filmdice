import type { Metadata } from "next"
import Link from "next/link"
import InfoPage, { Section, QA } from "@/components/InfoPage"
import { CREATOR } from "@/lib/site"

export const metadata: Metadata = {
  title: "FAQ · FilmDice",
  description: "How FilmDice works, For You picks, accounts, installing the app, and how it was built.",
}

export default function FaqPage() {
  return (
    <InfoPage
      title="FAQ"
      intro={<>Answers to common questions. Don&apos;t see yours? <a href="#contact" className="text-indigo-400 hover:text-indigo-300">Get in touch</a>.</>}
    >
      <Section title="Using FilmDice">
        <QA q="How does FilmDice work?">
          <p>
            FilmDice &ldquo;rolls the dice&rdquo; and shows you one random movie at a time. Decide
            what to do with it and the next one appears:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong className="text-zinc-200">Swipe right (♥)</strong> to like it. It&apos;s saved to your Liked list.</li>
            <li><strong className="text-zinc-200">Swipe left (✕)</strong> to skip it.</li>
            <li><strong className="text-zinc-200">Swipe up (👁)</strong> if you&apos;ve already seen it.</li>
          </ul>
          <p>On a computer, or if you prefer tapping, use the buttons under the card instead.</p>
        </QA>
        <QA q="How do filters work?">
          <p>
            Tap <strong className="text-zinc-200">⚙ Filters</strong> to narrow things down by genre, decade,
            rating, runtime, content rating, language, region, or streaming availability.
          </p>
          <p>
            Your changes apply starting with your <strong className="text-zinc-200">next roll</strong>. The movie
            on screen stays put. Filters stay on until you change them, hit Reset, or close the app.
          </p>
        </QA>
        <QA q="Will I see the same movie again?">
          <ul className="list-disc pl-5 space-y-1">
            <li><strong className="text-zinc-200">Liked</strong> movies won&apos;t be rolled again. They live in your Liked list.</li>
            <li><strong className="text-zinc-200">Watched</strong> movies are hidden for 90 days.</li>
            <li><strong className="text-zinc-200">Skipped</strong> movies can come back after about 30 days, in case you change your mind.</li>
          </ul>
        </QA>
        <QA q="Where are the movies I liked?">
          <p>
            Open the <strong className="text-zinc-200">Liked</strong> tab at the bottom of the screen. It has
            separate lists for movies you liked and movies you&apos;ve watched, and you can remove any of them.
          </p>
        </QA>
        <QA q="Where can I watch a movie I found?">
          <p>
            Each card shows where the movie is available in your region (streaming, rental, or purchase)
            and can play the trailer. Availability comes from JustWatch and can change, so double-check
            with the service before you settle in.
          </p>
        </QA>
      </Section>

      <Section title="For You picks">
        <QA q="What are “For You” cards?">
          <p>
            Every 10th card is a <strong className="text-zinc-200">⭐ For You</strong> pick, chosen to match your
            taste instead of being fully random.
          </p>
        </QA>
        <QA q="How does FilmDice learn my taste?">
          <p>
            It tallies the genres and decades of movies you interact with. Likes count the most, watched
            movies count a little, and skips count slightly against. Your top genre and decade then drive
            the For You picks, favoring well-rated films.
          </p>
          <p>
            For You picks start once you&apos;ve liked at least 5 movies. Until then you&apos;ll just get regular
            random rolls. They&apos;re based on your taste, not your current filters (other than region).
          </p>
        </QA>
      </Section>

      <Section title="Accounts & syncing">
        <QA q="Do I need an account?">
          <p>
            No. You can use FilmDice without signing in. Your history is tied to a random ID saved in
            your browser, so it stays on that device and browser only.
          </p>
        </QA>
        <QA q="Why sign in with Google?">
          <p>
            Signing in lets your likes, watched list, and taste profile follow you across devices.
          </p>
          <p>
            Heads up: history you built before signing in stays with your browser and doesn&apos;t move into
            your account.
          </p>
        </QA>
        <QA q="What does FilmDice get from my Google account?">
          <p>
            Only what&apos;s needed to sign you in. FilmDice&apos;s database stores your Google account&apos;s ID
            number. It does not store your name, email, or photo. Details are in the{" "}
            <Link href="/privacy" className="text-indigo-400 hover:text-indigo-300">Privacy Policy</Link>.
          </p>
        </QA>
        <QA q="How do I delete my data?">
          <p>
            Go to{" "}
            <Link href="/privacy#your-data" className="text-indigo-400 hover:text-indigo-300">Privacy → Your data</Link>{" "}
            and tap <strong className="text-zinc-200">Delete my data</strong>. It erases your swipe history and taste
            profile right away. Data is also deleted automatically after a year of no activity.
          </p>
        </QA>
      </Section>

      <Section title="Installing & troubleshooting">
        <QA q="Can I install FilmDice like an app?">
          <p>Yes, it works as an app on your home screen:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong className="text-zinc-200">Android (Chrome):</strong> open the ⋮ menu and choose <em>Install app</em> or <em>Add to Home screen</em>.</li>
            <li><strong className="text-zinc-200">iPhone (Safari):</strong> tap the Share button, then <em>Add to Home Screen</em>.</li>
          </ul>
        </QA>
        <QA q="Why does the first movie take a while to load?">
          <p>
            FilmDice&apos;s server runs on a free hosting plan that goes to sleep when nobody&apos;s using it.
            The first roll after a quiet period wakes it up, which can take up to a minute. After that it&apos;s quick.
          </p>
        </QA>
        <QA q="It says “No movies found.” What now?">
          <p>
            Your filters are probably too narrow, like a rare genre combined with a tight decade and rating
            range. Loosen one or two, or tap Reset.
          </p>
        </QA>
        <QA q="It says “Something went wrong.”">
          <p>
            Tap <strong className="text-zinc-200">Try Again</strong>. If the server was asleep it may need a moment.
            If it keeps happening, please{" "}
            <a href="#contact" className="text-indigo-400 hover:text-indigo-300">let me know</a>.
          </p>
        </QA>
        <QA q="I don't see a new feature or fix yet.">
          <p>
            Fully close the tab or app and open it again. Installed apps can hold on to the previous version briefly.
          </p>
        </QA>
      </Section>

      <Section title="How FilmDice was built">
        <QA q="Who made FilmDice, and why?">
          <p>
            FilmDice is a personal project by {CREATOR.name}, a software developer in {CREATOR.location}.
            It started from a simple problem: spending more time scrolling for something to watch than
            actually watching. Rolling the dice on one movie at a time makes deciding quick, and
            learning your taste makes the rolls better over time.
          </p>
          <p>
            <Link href="/about" className="text-indigo-400 hover:text-indigo-300">More about Cameron, plus resume →</Link>
          </p>
        </QA>
        <QA q="When was it built?">
          <p>
            Development started in January 2026. It began as a local app and was moved to the cloud
            so anyone can use it, and it&apos;s still being improved.
          </p>
        </QA>
        <QA q="What's it built with?">
          <ul className="list-disc pl-5 space-y-1">
            <li><strong className="text-zinc-200">Frontend:</strong> Next.js, React, and Tailwind CSS, hosted on Vercel, installable as a web app</li>
            <li><strong className="text-zinc-200">Backend:</strong> Python with FastAPI, hosted on Render</li>
            <li><strong className="text-zinc-200">Database:</strong> PostgreSQL, for swipe history and taste profiles</li>
            <li><strong className="text-zinc-200">Data:</strong> The Movie Database (TMDB) API, with streaming info from JustWatch</li>
            <li><strong className="text-zinc-200">Sign-in:</strong> Google, via Auth.js</li>
          </ul>
          <p>
            The source code is on{" "}
            <a href={CREATOR.repo} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300">GitHub</a>.
          </p>
        </QA>
        <QA q="Was AI used to build it?">
          <p>
            Yes. FilmDice was built with the help of AI coding assistants, including Claude. They were used
            to plan features, write and review code, track down bugs, and prepare the app for cloud
            deployment, with every change directed, tested, and shipped by {CREATOR.name}.
          </p>
        </QA>
        <QA q="What's next?">
          <p>
            Ongoing polish to the swipe experience, smarter For You picks, and faster loading. Have an
            idea or found a bug?{" "}
            <a href="#contact" className="text-indigo-400 hover:text-indigo-300">Send it over</a>.
          </p>
        </QA>
      </Section>
    </InfoPage>
  )
}
