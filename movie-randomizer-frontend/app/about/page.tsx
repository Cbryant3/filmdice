import type { Metadata } from "next"
import InfoPage, { Section, Prose } from "@/components/InfoPage"
import { CREATOR } from "@/lib/site"

export const metadata: Metadata = {
  title: "About · FilmDice",
  description: `About ${CREATOR.name}, the developer behind FilmDice, with resume and contact links.`,
}

const RESUME_URL = "/Cameron_Bryant_Resume.pdf"

const SKILLS = [
  "Python", "FastAPI", "TypeScript", "JavaScript", "Next.js", "React", "Java", "Spring Boot",
  "SQL", "PostgreSQL", "Docker", "REST APIs", "Git", "Tableau", "Excel", "Dart / Flutter", "C", "R",
]

const PROJECTS = [
  {
    name: "FilmDice",
    when: "2026 – present",
    blurb: "This app. A full-stack movie discovery app with a swipe interface, a taste-learning recommendation engine, Google sign-in, and streaming availability.",
    links: [{ label: "Source", href: CREATOR.repo }],
  },
  {
    name: "Advanced Encryption Suite",
    when: "2025",
    blurb: "A Python command-line tool implementing AES, DES, and RSA with configurable key sizes and modes, SHA-256 hashing, and speed benchmarks.",
    links: [{ label: "Source", href: "https://github.com/Cbryant3/advanced-encryption-suite---cbryant3" }],
  },
  {
    name: "Wheelchair Basketball Prototype",
    when: "2024",
    blurb: "A rehab-engineering prototype improving comfort and stability for wheelchair basketball athletes, built with a 6-person team. Placed top 3 of 20+ teams at Kaplan Institute Innovation Day.",
    links: [],
  },
]

export default function AboutPage() {
  return (
    <InfoPage
      title="About"
      intro={<>The person behind the dice.</>}
    >
      <section className="mb-10 rounded-2xl bg-zinc-900 border border-zinc-800 p-5">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 shrink-0 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xl font-black">
            CB
          </div>
          <div>
            <h2 className="text-white font-bold text-xl leading-tight">{CREATOR.name}</h2>
            <p className="text-zinc-400 text-sm">Software developer · {CREATOR.location}</p>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <a
            href={RESUME_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2 rounded-full text-sm font-medium transition-colors"
          >
            View resume
          </a>
          <a
            href={RESUME_URL}
            download="Cameron_Bryant_Resume.pdf"
            className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-5 py-2 rounded-full text-sm font-medium transition-colors"
          >
            Download PDF
          </a>
        </div>
      </section>

      <Section title="Hi, I'm Cameron">
        <Prose>
          <p>
            I&apos;m a Chicago-based software developer with a B.S. in Computer Science from the{" "}
            <strong>Illinois Institute of Technology</strong> (2025). I also completed{" "}
            <strong>Revature&apos;s Full-Stack Developer Program</strong>, 400+ hours of building web apps
            with Java, Spring Boot, and SQL in Agile teams. I&apos;m currently a{" "}
            <strong>Data Analytics Fellow with COOP Careers</strong>, working in SQL, Python, and Tableau.
          </p>
          <p>
            I like building complete things people actually use. FilmDice is a good example: it started
            as a way to stop scrolling endlessly for something to watch, and grew into a full-stack app
            with its own recommendation engine.
          </p>
          <p>
            I also teach. As an instructor at <strong>Hughes Who Technologies Studio</strong>, I design
            lessons and teach HTML, CSS, JavaScript, Python, and Scratch to 100+ students.
          </p>
        </Prose>
      </Section>

      <Section title="Skills">
        <ul className="flex flex-wrap gap-2">
          {SKILLS.map(s => (
            <li key={s} className="px-3 py-1 rounded-full text-xs font-medium border border-zinc-700 text-zinc-300">
              {s}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Selected projects">
        {PROJECTS.map(p => (
          <div key={p.name} className="rounded-xl bg-zinc-900 border border-zinc-800 px-4 py-3">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="text-white text-sm font-semibold">{p.name}</h3>
              <span className="text-zinc-500 text-xs whitespace-nowrap">{p.when}</span>
            </div>
            <p className="text-zinc-400 text-sm mt-1 leading-relaxed">{p.blurb}</p>
            {p.links.map(l => (
              <a key={l.href} href={l.href} target="_blank" rel="noopener noreferrer" className="inline-block mt-2 text-indigo-400 hover:text-indigo-300 text-sm">
                {l.label} →
              </a>
            ))}
          </div>
        ))}
      </Section>

      <Section title="Let's connect">
        <Prose>
          <p>
            I&apos;m open to opportunities in <strong>software development</strong>,{" "}
            <strong>data analytics</strong>, and <strong>IT</strong>. If you&apos;re hiring, have
            feedback on FilmDice, or just want to talk code, reach out using the links below.
          </p>
        </Prose>
      </Section>
    </InfoPage>
  )
}
