import { defineConfig } from "@playwright/test"

/**
 * Browser tests run against a production build of the app, with the backend
 * replaced by a mock (see e2e/mock-api.ts). Each test runs twice: at phone
 * size and at desktop size.
 *
 *   npm run test:e2e        (builds, starts the app on :3100, runs tests)
 */
const PORT = 3100

export default defineConfig({
  testDir: "./e2e",
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "phone", use: { viewport: { width: 390, height: 844 }, isMobile: false, hasTouch: false } },
    { name: "desktop", use: { viewport: { width: 1280, height: 860 } } },
  ],
  webServer: {
    command: process.env.E2E_SKIP_BUILD ? `npx next start -p ${PORT}` : `npx next build && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
    env: {
      NEXT_PUBLIC_API_URL: "http://api.test",
      AUTH_SECRET: "e2e-test-secret",
      AUTH_TRUST_HOST: "true",
    },
  },
})
