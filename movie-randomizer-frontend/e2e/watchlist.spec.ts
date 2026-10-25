import { test, expect, makeMovie } from "./mock-api"

test.describe("Liked and Watched lists", () => {
  test.beforeEach(async ({ api }) => {
    api.liked = [makeMovie(101, { title: "Liked One" }), makeMovie(102, { title: "Liked Two" })]
    api.watched = [makeMovie(201, { title: "Seen It" })]
  })

  test("shows liked and watched movies in separate tabs", async ({ page }) => {
    await page.goto("/watchlist")
    await expect(page.getByRole("button", { name: "Liked (2)" })).toBeVisible()
    await expect(page.getByText("Liked One")).toBeVisible()
    await expect(page.getByText("Liked Two")).toBeVisible()
    await page.getByRole("button", { name: "Watched (1)" }).click()
    await expect(page.getByText("Seen It")).toBeVisible()
    await expect(page.getByText("Liked One")).toBeHidden()
  })

  test("tapping a poster opens the details view", async ({ page }) => {
    await page.goto("/watchlist")
    await page.getByRole("button", { name: "Details for Liked One" }).click()
    await expect(page.getByText("Overview text for test movie 101.")).toBeVisible()
    await expect(page.getByText("Where to Watch")).toBeVisible()
    await expect(page.getByText("2001").last()).toBeVisible() // release year shown
    await page.keyboard.press("Escape")
    await expect(page.getByText("Overview text for test movie 101.")).toBeHidden()
  })

  test("the Details button opens it too, and the trailer plays from there", async ({ page }) => {
    await page.goto("/watchlist")
    await page.getByRole("button", { name: "Details", exact: true }).first().click()
    await page.getByRole("button", { name: /Watch Trailer/ }).click()
    await expect(page.locator("iframe")).toHaveAttribute("src", /youtube-nocookie\.com\/embed\/trailer101/)
  })

  test("details view fits on screen", async ({ page }) => {
    await page.goto("/watchlist")
    await page.getByRole("button", { name: "Details for Liked One" }).click()
    const trailer = page.getByRole("button", { name: /Watch Trailer/ })
    await expect(trailer).toBeVisible()
    const box = (await trailer.boundingBox())!
    const vp = page.viewportSize()!
    expect(box.y + box.height).toBeLessThanOrEqual(vp.height)
  })

  test("Remove deletes the movie from the list", async ({ page, api }) => {
    await page.goto("/watchlist")
    await expect(page.getByText("Liked Two")).toBeVisible()
    await page.getByRole("button", { name: "Remove" }).nth(1).click()
    await expect(page.getByText("Liked Two")).toBeHidden()
    expect(api.requests(/^\/interactions\/.+\/102$/, "DELETE")).toHaveLength(1)
  })

  test("empty state explains what to do", async ({ page, api }) => {
    api.liked = []
    api.watched = []
    await page.goto("/watchlist")
    await expect(page.getByText("Nothing here yet")).toBeVisible()
  })
})
