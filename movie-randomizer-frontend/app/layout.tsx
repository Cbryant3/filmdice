import type { Metadata } from "next"
import { Geist } from "next/font/google"
import "./globals.css"
import Navbar from "@/components/Navbar"

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] })

export const metadata: Metadata = {
  title: "FilmDice",
  description: "Swipe to discover your next favourite film",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} h-full antialiased dark`}>
      <body className="min-h-full bg-zinc-950 text-white flex flex-col">
        {children}
        <Navbar />
      </body>
    </html>
  )
}
