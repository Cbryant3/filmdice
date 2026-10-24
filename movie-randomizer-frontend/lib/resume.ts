// Resume content shown on the About page. Mirrors the PDF at
// public/Cameron_Bryant_Resume.pdf; update both together.

export const RESUME_PDF = "/Cameron_Bryant_Resume.pdf"

export interface ResumeEntry {
  title: string
  org: string
  where?: string
  when: string
  link?: { label: string; href: string }
  bullets: string[]
}

export const EXPERIENCE: ResumeEntry[] = [
  {
    title: "Instructor",
    org: "Hughes Who Technologies Studio",
    where: "Chicago, IL",
    when: "May 2026 – Present",
    bullets: [
      "Design 5 lesson plans and teach HTML, CSS, JavaScript, Python, and Scratch to 8 classes (100+ students).",
      "Drive project completion from ~60% to 90%+ through personal, instant-feedback capstone projects.",
    ],
  },
  {
    title: "Security Professional & Front Desk Receptionist",
    org: "Allied Universal Security",
    where: "Chicago, IL",
    when: "Feb 2025 – Present",
    bullets: [
      "Manage RFID access control for 100+ daily visitors and 50+ weekly vendors, averaging ~10-second check-ins with zero security breaches on assigned shifts.",
      "Introduced a timed, first-come-first-served vendor check-in for 150+ events (250–350 attendees), keeping load-in on schedule or up to 20 minutes early with zero vendor complaints.",
    ],
  },
]

export const PROJECTS: ResumeEntry[] = [
  {
    title: "FilmDice: Movie Discovery Web App",
    org: "Next.js · FastAPI · PostgreSQL · Docker",
    when: "Jan 2026 – Present",
    link: { label: "GitHub", href: "https://github.com/Cbryant3/filmdice" },
    bullets: [
      "Deployed a full-stack movie discovery web app searching 1.3M+ TMDB titles with dynamic filters and streaming availability, serving 20+ users with sub-1-second page loads.",
      "Engineered a weighted preference-learning engine that scores swipes by genre and decade; all 10 testers found a recommended movie they loved within ~2 minutes of initial usage.",
    ],
  },
  {
    title: "Wheelchair Basketball Prototype",
    org: "CAD · 3D Modeling · Sewing · User Research",
    when: "Aug 2024 – Dec 2024",
    bullets: [
      "Earned Top-3 placement among 20+ teams at Kaplan Institute Innovation Day for a rehab-engineering prototype improving comfort and stability for wheelchair basketball athletes.",
      "Led interviews with 4 Paralympic athletes, data collection, and the final presentation for a 6-member team.",
    ],
  },
  {
    title: "Advanced Encryption Suite",
    org: "Python · AES/DES/RSA · CLI",
    when: "Aug 2025 – Nov 2025",
    link: { label: "GitHub", href: "https://github.com/Cbryant3/advanced-encryption-suite---cbryant3" },
    bullets: [
      "Built a Python CLI implementing AES, DES, and RSA with configurable key sizes, CBC/CFB modes, SHA-256 hashing, and an AES vs. RSA speed benchmark.",
    ],
  },
]

export const EDUCATION: ResumeEntry[] = [
  {
    title: "Data Analytics Fellow",
    org: "COOP Careers",
    when: "Expected Dec 2026",
    bullets: [
      "Completing a 16-week, 200+ hour fellowship in data cleaning, analysis, and visualization using SQL, Python, and Tableau.",
      "Analyzed 35K+ Chicago Data Portal records in Excel and Tableau, identifying Pulaski (Blue) as the least-safe CTA station at 11x the median crime rate and Sundays as the peak-risk day (+61%).",
    ],
  },
  {
    title: "Full-Stack Developer Program",
    org: "Revature",
    when: "Jan 2025 – Jun 2025",
    bullets: [
      "Completed 400+ hours of full-stack training (Java, Spring Boot, SQL, front-end), building web apps in Agile teams with Git and clean-code practices.",
    ],
  },
  {
    title: "B.S., Computer Science",
    org: "Illinois Institute of Technology",
    where: "Chicago, IL",
    when: "May 2025",
    bullets: ["Dean's List (Fall 2024)"],
  },
]

export const SKILL_GROUPS: { label: string; items: string[] }[] = [
  {
    label: "Languages & frameworks",
    items: [
      "Python", "FastAPI", "Flask", "Matplotlib", "JavaScript", "TypeScript", "Next.js", "React",
      "Java", "Spring Boot", "SQL", "PostgreSQL", "Dart / Flutter", "C", "R",
    ],
  },
  { label: "Tools", items: ["Git / GitHub", "Docker", "REST APIs", "Tableau", "Excel"] },
]

export const CERTIFICATIONS = ["Google AI Professional Certificate (Google, via Coursera), Oct 2026"]
