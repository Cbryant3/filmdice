import { test, expect, cardTitle, visible } from "./mock-api"
import type { Page } from "@playwright/test"

/** The filter panel's own close button (the Skip button is also "✕"). */
const closeFilters = (page: Page) =>
  page.locator("div.fixed.inset-0.z-40").getByRole("button", { name: "✕" }).click()

test.describe("Filters", () => {
  test("opening and closing filters without changes keeps the movie", async ({ page, api }) => {
    await page.goto("/")
    await expect(cardTitle(page)).toHaveText("Test Movie 1")
    const before = api.requests("/random-movie").length
    await page.getByRole("button", { name: /Filters/ }).click()
    await expect(page.getByRole("heading", { name: "Filters" })).toBeVisible()
    await closeFilters(page)
    await expect(page.getByRole("heading", { name: "Filters" })).toBeHidden()
    await expect(cardTitle(page)).toHaveText("Test Movie 1")
    await page.waitForTimeout(500)
    expect(api.requests("/random-movie").length).toBe(before)
  })

  test("changed filters keep the current movie and apply from the next roll", async ({ page, api }) => {
    await page.goto("/")
    await expect(cardTitle(page)).toHaveText("Test Movie 1")
    await page.getByRole("button", { name: /Filters/ }).click()
    await page.getByRole("button", { name: "Horror" }).click()
    await closeFilters(page)

    await expect(cardTitle(page)).toHaveText("Test Movie 1") // not replaced on close
    await expect.poll(() => api.requests("/random-movie").at(-1)!.body?.filters)
      .toMatchObject({ genre_ids: [27] })                   // next film fetched with the filter
    await visible(page, 'button[title="Skip"]').click()
    await expect(cardTitle(page)).not.toHaveText("Test Movie 1")
  })

  test("filter indicator shows when filters are active", async ({ page }) => {
    await page.goto("/")
    await expect(cardTitle(page)).toBeVisible()
    const filtersBtn = page.getByRole("button", { name: /Filters/ })
    await expect(filtersBtn.locator("span.rounded-full")).toHaveCount(0)
    await filtersBtn.click()
    await page.getByRole("button", { name: "Drama" }).click()
    await closeFilters(page)
    await expect(filtersBtn.locator("span.rounded-full")).toHaveCount(1)
  })
})

test.describe("Loading and error states", () => {
  test("cold start: shows the waking-up message, then the movie", async ({ page, api }) => {
    api.wakeDelayMs = 8000
    await page.goto("/")
    await expect(page.getByText("Waking up the server…")).toBeVisible({ timeout: 8000 })
    await expect(cardTitle(page)).toHaveText("Test Movie 1", { timeout: 20000 })
    await expect(page.getByText("Waking up the server…")).toBeHidden()
    await expect(page.getByText("Couldn't roll a movie")).toBeHidden()
  })

  test("no matches: shows 'No movies found' with a way to fix filters", async ({ page, api }) => {
    api.rollStatus = 404
    await page.goto("/")
    await expect(page.getByText("No movies found")).toBeVisible()
    await page.getByRole("button", { name: "Open Filters" }).click()
    await expect(page.getByRole("heading", { name: "Filters" })).toBeVisible()
  })

  test("rate limited: shows the slow-down screen", async ({ page, api }) => {
    api.rollStatus = 429
    await page.goto("/")
    await expect(page.getByText("Whoa, slow down!")).toBeVisible()
  })

  test("server error: friendly message, and Try Again recovers", async ({ page, api }) => {
    api.rollStatus = 500
    await page.goto("/")
    await expect(page.getByText("Couldn't roll a movie")).toBeVisible()
    await expect(page.getByText("backend is running")).toHaveCount(0)
    api.rollStatus = null
    await page.getByRole("button", { name: "Try Again" }).click()
    await expect(cardTitle(page)).toBeVisible()
  })
})
