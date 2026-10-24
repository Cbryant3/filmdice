import type { Metadata } from "next"
import InfoPage from "@/components/InfoPage"
import StatsDashboard from "@/components/StatsDashboard"

export const metadata: Metadata = {
  title: "Stats · FilmDice",
  description: "Live, anonymous usage and health numbers for FilmDice.",
}

export default function StatsPage() {
  return (
    <InfoPage
      title="Stats"
      intro={<>Live numbers from FilmDice: who&apos;s using it, how they swipe, how well the recommendations land, and how the server is holding up.</>}
    >
      <StatsDashboard />
    </InfoPage>
  )
}
