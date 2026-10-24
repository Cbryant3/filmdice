import type { Metadata } from "next"
import InfoPage, { Section, Prose } from "@/components/InfoPage"
import DeleteDataButton from "@/components/DeleteDataButton"
import { CREATOR, RETENTION_DAYS, PRIVACY_EFFECTIVE_DATE } from "@/lib/site"

export const metadata: Metadata = {
  title: "Privacy Policy · FilmDice",
  description: "What FilmDice stores, why, who it's shared with, and how to delete it.",
}

const retentionText = RETENTION_DAYS === 365 ? "one year" : `${RETENTION_DAYS} days`

export default function PrivacyPage() {
  return (
    <InfoPage
      title="Privacy Policy"
      intro={
        <>
          <p>Effective {PRIVACY_EFFECTIVE_DATE}</p>
          <p className="mt-2">
            FilmDice is a free, non-commercial project run by {CREATOR.name}. The short version: it
            stores only what it needs to remember your swipes, it doesn&apos;t sell or share your data,
            there are no ads or analytics trackers, and you can delete everything at any time.
          </p>
        </>
      }
    >
      <Section title="What FilmDice stores">
        <Prose>
          <p><strong>If you use FilmDice without signing in:</strong></p>
          <ul>
            <li>
              A random ID created in your browser and saved in its local storage. It isn&apos;t linked to
              your name or any personal details. It just tells the server which swipe history is yours.
            </li>
          </ul>
          <p><strong>If you sign in with Google:</strong></p>
          <ul>
            <li>
              Your Google account&apos;s unique ID number, which FilmDice uses in place of the random ID.
              FilmDice&apos;s database does <em>not</em> store your name, email address, or profile photo.
            </li>
            <li>
              A sign-in cookie in your browser that keeps you logged in. Google provides your name, email,
              and profile photo at sign-in, and these are kept in that encrypted cookie on your device so
              the app can show your photo. They are not saved on FilmDice&apos;s servers.
            </li>
          </ul>
          <p><strong>For everyone, linked to that ID:</strong></p>
          <ul>
            <li>Which movies you liked, marked as watched, or skipped, and when.</li>
            <li>Which movies were shown to you, so they aren&apos;t repeated too soon.</li>
            <li>Each movie&apos;s genres and release year, used to build your taste profile.</li>
            <li>Your taste profile: scores for the genres and decades you seem to enjoy.</li>
          </ul>
          <p>
            Your filter settings aren&apos;t saved on the server. They&apos;re sent along with each roll and
            reset when you close the app.
          </p>
        </Prose>
      </Section>

      <Section title="How it's used">
        <Prose>
          <p>Your data is used only to run FilmDice for you:</p>
          <ul>
            <li>to avoid showing you movies you&apos;ve already liked, watched, or recently skipped;</li>
            <li>to show your Liked and Watched lists, and sync them across devices if you sign in;</li>
            <li>to pick the ⭐ For You movies that match your taste.</li>
          </ul>
          <p>
            FilmDice does not sell your data, show ads, use analytics or tracking tools, or use your
            data for anything else.
          </p>
        </Prose>
      </Section>

      <Section title="Services FilmDice relies on">
        <Prose>
          <ul>
            <li>
              <strong>The Movie Database (TMDB)</strong> supplies movie details, posters, and streaming
              info. Requests to TMDB are made by FilmDice&apos;s server and don&apos;t include your ID or
              any personal information. Posters load directly from TMDB&apos;s image servers, which can see
              your IP address like any website you load images from.
            </li>
            <li>
              <strong>Google</strong> handles sign-in if you choose to use it, under{" "}
              <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">Google&apos;s Privacy Policy</a>.
            </li>
            <li>
              <strong>YouTube</strong> plays trailers when you tap one. FilmDice uses YouTube&apos;s
              privacy-enhanced mode, so YouTube doesn&apos;t set tracking cookies unless you play a video.
              Playback is covered by Google&apos;s Privacy Policy.
            </li>
            <li>
              <strong>JustWatch</strong> provides streaming availability through TMDB. &ldquo;Where to
              watch&rdquo; links take you to JustWatch&apos;s site.
            </li>
            <li>
              <strong>Vercel</strong> hosts the website and <strong>Render</strong> hosts the server and
              database. Like most hosts, they may keep short-term technical logs such as IP addresses and
              request times for security and reliability.
            </li>
          </ul>
        </Prose>
      </Section>

      <Section title="How long data is kept">
        <Prose>
          <p>
            Your swipe history and taste profile are kept while you use FilmDice. If an ID has no
            activity for {retentionText}, everything stored for it is deleted automatically. You can also
            delete it yourself at any time (below).
          </p>
        </Prose>
      </Section>

      <Section id="your-data" title="Your data, your choice">
        <Prose>
          <p>
            Tapping <strong>Delete my data</strong>{" "}permanently erases your liked and watched lists,
            swipe history, and taste profile from FilmDice&apos;s database. If you&apos;re signed in,
            it erases the data for your account and for this browser, then signs you out. Without
            signing in, it erases this browser&apos;s data and resets its random ID.
          </p>
          <p>
            Signing out alone doesn&apos;t delete anything. To also remove FilmDice&apos;s access to your
            Google account, visit your{" "}
            <a href="https://myaccount.google.com/connections" target="_blank" rel="noopener noreferrer">Google account connections</a>.
          </p>
        </Prose>
        <div className="pt-3">
          <DeleteDataButton />
        </div>
        <Prose>
          <p className="pt-2">
            Can&apos;t use the button, or want a copy of your data first? Email{" "}
            <a href={`mailto:${CREATOR.email}`}>{CREATOR.email}</a>.
          </p>
        </Prose>
      </Section>

      <Section title="Security">
        <Prose>
          <p>
            Data travels over encrypted HTTPS connections, and FilmDice stores as little as possible,
            so there&apos;s very little that could be exposed. That said, FilmDice is a small personal
            project, and no online service can promise perfect security.
          </p>
        </Prose>
      </Section>

      <Section title="Age requirement">
        <Prose>
          <p>
            FilmDice is intended for people 13 and older. It isn&apos;t directed at children under 13,
            and it doesn&apos;t knowingly collect information from them. If you believe a child under 13 has
            used FilmDice, contact me and their data will be deleted.
          </p>
        </Prose>
      </Section>

      <Section title="Changes to this policy">
        <Prose>
          <p>
            If FilmDice starts collecting anything new or using data differently, this page will be
            updated and the effective date above will change.
          </p>
        </Prose>
      </Section>

      <Section title="Questions">
        <Prose>
          <p>
            Questions about privacy? Contact {CREATOR.name} at{" "}
            <a href={`mailto:${CREATOR.email}`}>{CREATOR.email}</a>.
          </p>
        </Prose>
      </Section>
    </InfoPage>
  )
}
