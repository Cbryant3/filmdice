import type { Metadata, Viewport } from "next"
import { Geist } from "next/font/google"
import "./globals.css"
import Navbar from "@/components/Navbar"
import ErrorBoundary from "@/components/ErrorBoundary"
import Providers from "@/components/Providers"

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] })

export const metadata: Metadata = {
  title: "FilmDice",
  description: "Swipe to discover your next favourite film",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "FilmDice",
  },
}

export const viewport: Viewport = {
  themeColor: "#09090b",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} h-full antialiased dark`}>
      <body className="min-h-full bg-zinc-950 text-white flex flex-col">
        <Providers>
          <ErrorBoundary>
            {children}
            <Navbar />
          </ErrorBoundary>
        </Providers>
      </body>
    </html>
  )
}
