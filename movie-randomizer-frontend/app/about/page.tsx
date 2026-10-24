import type { Metadata } from "next"
import InfoPage, { Section, Prose } from "@/components/InfoPage"
import { CREATOR } from "@/lib/site"
import {
  RESUME_PDF, EXPERIENCE, PROJECTS, EDUCATION, SKILL_GROUPS, CERTIFICATIONS,
  type ResumeEntry,
} from "@/lib/resume"

export const metadata: Metadata = {
  title: "About · FilmDice",
  description: `About ${CREATOR.name}, the developer behind FilmDice: resume, projects, and contact links.`,
}

export default function AboutPage() {
  return (
    <InfoPage title="About" intro={<>The person behind the dice.</>}>
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
          <a href="#resume" className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2 rounded-full text-sm font-medium transition-colors">
            View resume
          </a>
          <ResumeDownload />
        </div>
      </section>

      <Section title="Hi, I'm Cameron">
        <Prose>
          <p>
            I&apos;m a Chicago-based software developer with a B.S. in Computer Science from the{" "}
            <strong>Illinois Institute of Technology</strong> and a full-stack developer certificate
            from <strong>Revature</strong>. Right now I&apos;m a{" "}
            <strong>Data Analytics Fellow with COOP Careers</strong> and a coding instructor at{" "}
            <strong>Hughes Who Technologies Studio</strong>.
          </p>
          <p>
            I like building complete things people actually use. FilmDice is a good example: it started
            as a way to stop scrolling endlessly for something to watch, and grew into a full-stack app
            with its own recommendation engine.
          </p>
          <p>
            I&apos;m open to opportunities in <strong>software development</strong>,{" "}
            <strong>data analytics</strong>, and <strong>IT</strong>.
          </p>
        </Prose>
      </Section>

      {/* ---------------- Resume ---------------- */}
      <section id="resume" className="mb-10 scroll-mt-6">
        <div className="flex items-center justify-between gap-4 border-b border-zinc-800 pb-3 mb-6">
          <h2 className="text-white font-bold text-lg">Resume</h2>
          <a
            href={RESUME_PDF}
            download="Cameron_Bryant_Resume.pdf"
            className="text-indigo-400 hover:text-indigo-300 text-sm font-medium whitespace-nowrap"
          >
            ↓ Download PDF
          </a>
        </div>

        <Section title="Experience">
          <Entries items={EXPERIENCE} />
        </Section>

        <Section title="Projects">
          <Entries items={PROJECTS} />
        </Section>

        <Section title="Education">
          <Entries items={EDUCATION} />
        </Section>

        <Section title="Skills">
          <div className="space-y-4">
            {SKILL_GROUPS.map(g => (
              <div key={g.label}>
                <p className="text-zinc-500 text-xs mb-2">{g.label}</p>
                <ul className="flex flex-wrap gap-2">
                  {g.items.map(s => (
                    <li key={s} className="px-3 py-1 rounded-full text-xs font-medium border border-zinc-700 text-zinc-300">
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Certifications">
          <ul className="space-y-1">
            {CERTIFICATIONS.map(c => (
              <li key={c} className="text-zinc-300 text-sm">{c}</li>
            ))}
          </ul>
        </Section>

        <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-5 flex flex-wrap items-center justify-between gap-4">
          <p className="text-zinc-300 text-sm">Want the full resume as a PDF?</p>
          <ResumeDownload />
        </div>
      </section>
    </InfoPage>
  )
}

function ResumeDownload() {
  return (
    <a
      href={RESUME_PDF}
      download="Cameron_Bryant_Resume.pdf"
      className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-5 py-2 rounded-full text-sm font-medium transition-colors"
    >
      Download PDF
    </a>
  )
}

function Entries({ items }: { items: ResumeEntry[] }) {
  return (
    <ol className="relative border-l border-zinc-800 ml-1.5 space-y-6">
      {items.map(e => (
        <li key={e.title + e.org} className="pl-5 relative">
          <span className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-indigo-500" />
          <div className="flex flex-wrap items-baseline justify-between gap-x-3">
            <h3 className="text-white text-sm font-semibold">{e.title}</h3>
            <span className="text-zinc-500 text-xs whitespace-nowrap">{e.when}</span>
          </div>
          <p className="text-zinc-400 text-sm">
            {e.org}
            {e.where && <span className="text-zinc-500"> · {e.where}</span>}
            {e.link && (
              <>
                {" · "}
                <a href={e.link.href} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300">
                  {e.link.label}
                </a>
              </>
            )}
          </p>
          <ul className="mt-2 list-disc pl-4 space-y-1 text-zinc-400 text-sm leading-relaxed">
            {e.bullets.map(b => <li key={b}>{b}</li>)}
          </ul>
        </li>
      ))}
    </ol>
  )
}
