import { test, expect } from "./mock-api"

const PAGES = ["/", "/watchlist", "/faq", "/about", "/privacy", "/stats"]

test.describe("Info pages", () => {
  test("Info tab opens the FAQ and highlights on info pages", async ({ page }) => {
    await page.goto("/")
    await page.getByRole("link", { name: /Info/ }).click()
    await expect(page).toHaveURL(/\/faq$/)
    await expect(page.getByRole("link", { name: /Info/ })).toHaveClass(/text-indigo-400/)
  })

  test("FAQ answers expand, and cover undo and AI use", async ({ page }) => {
    await page.goto("/faq")
    await page.getByText("I swiped by accident. Can I undo it?").click()
    await expect(page.getByText("You can undo several swipes in a row.", { exact: false })).toBeVisible()
    await page.getByText("Was AI used to build it?").click()
    await expect(page.getByText("Anthropic's AI assistant", { exact: false })).toBeVisible()
  })

  test("credits include the TMDB notice and the Claude credit", async ({ page }) => {
    await page.goto("/faq")
    await expect(page.getByText("This product uses the TMDB API but is not endorsed or certified by TMDB.")).toBeVisible()
    await expect(page.getByText("isn't affiliated with or endorsed by Anthropic", { exact: false })).toBeVisible()
  })

  test("contact links are correct", async ({ page }) => {
    await page.goto("/about")
    await expect(page.locator('a[href="mailto:cameron.bryant823@gmail.com"]').first()).toBeVisible()
    await expect(page.locator('a[href="https://www.linkedin.com/in/cameron-g-bryant/"]').first()).toBeVisible()
    await expect(page.locator('a[href="https://github.com/Cbryant3"]').first()).toBeVisible()
  })

  test("About shows the resume and the PDF downloads", async ({ page }) => {
    await page.goto("/about")
    await expect(page.getByRole("heading", { name: "Resume" })).toBeVisible()
    await expect(page.getByText("Hughes Who Technologies Studio").first()).toBeVisible()
    await expect(page.getByText("(872)")).toHaveCount(0) // phone number stays off the site
    const res = await page.request.get("/Cameron_Bryant_Resume.pdf")
    expect(res.status()).toBe(200)
    expect(res.headers()["content-type"]).toContain("pdf")
  })

  for (const path of PAGES) {
    test(`no sideways scrolling on ${path}`, async ({ page }) => {
      await page.goto(path)
      await page.waitForLoadState("networkidle")
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
      expect(overflow).toBeLessThanOrEqual(0)
    })
  }
})

test.describe("Privacy: Delete my data", () => {
  test("cancel does nothing", async ({ page, api }) => {
    await page.goto("/privacy#your-data")
    await page.getByRole("button", { name: "Delete my data" }).click()
    await page.getByRole("button", { name: "Cancel" }).click()
    await expect(page.getByRole("button", { name: "Delete my data" })).toBeVisible()
    expect(api.requests(/^\/users\/[^/]+$/, "DELETE")).toHaveLength(0)
  })

  test("confirming erases this browser's data and resets its ID", async ({ page, api }) => {
    await page.goto("/privacy")
    await page.evaluate(() => localStorage.setItem("filmdice_user_id", "guest-e2e"))
    await page.reload()
    await page.getByRole("button", { name: "Delete my data" }).click()
    await expect(page.getByText("can't be undone", { exact: false })).toBeVisible()
    await page.getByRole("button", { name: "Yes, delete everything" }).click()
    await expect(page.getByText("Your data has been deleted")).toBeVisible()
    expect(api.requests("/users/guest-e2e", "DELETE")).toHaveLength(1)
    expect(await page.evaluate(() => localStorage.getItem("filmdice_user_id"))).toBeNull()
  })
})

test.describe("Stats page", () => {
  test("shows live numbers, charts and the For You comparison", async ({ page }) => {
    await page.goto("/stats")
    await expect(page.getByText("Total users")).toBeVisible()
    await expect(page.getByText("42", { exact: true }).first()).toBeVisible()
    await expect(page.getByText("Swipes per day")).toBeVisible()
    await expect(page.getByText("65%")).toBeVisible()   // For You like rate
    await expect(page.getByText("37%")).toBeVisible()   // random like rate
    await expect(page.getByText("Most Liked Film")).toBeVisible()
    await expect(page.getByText("Swipes undone")).toBeVisible()
    await page.getByText("Show as table").click()
    await expect(page.locator("table tbody tr")).toHaveCount(30)
  })

  test("hovering a bar shows that day's value", async ({ page }) => {
    await page.goto("/stats")
    await page.locator('figure button[aria-label]').nth(29).hover()
    await expect(page.locator("figure").first().getByText(/on Oct 24/)).toBeVisible()
  })

  test("shows a friendly message if stats can't load", async ({ page, api }) => {
    api.statsStatus = 500
    await page.goto("/stats")
    await expect(page.getByText("Couldn't load stats right now.")).toBeVisible()
  })
})
