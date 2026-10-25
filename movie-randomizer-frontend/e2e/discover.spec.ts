import { test, expect, cardTitle, visible } from "./mock-api"

test.describe("Discover: rolling and swiping", () => {
  test("shows a movie with its details", async ({ page, api }) => {
    await page.goto("/")
    await expect(cardTitle(page)).toHaveText("Test Movie 1")
    await expect(visible(page, 'span:has-text("PG-13")')).toBeVisible()
    expect(api.requests("/random-movie").length).toBeGreaterThanOrEqual(1)
  })

  for (const [button, payload, toast] of [
    ["Like", { status: "liked" }, "Added to liked"],
    ["Mark as Watched", { status: "watched" }, "Marked as watched"],
    ["Skip", { skip: true }, null],
  ] as const) {
    test(`${button} button records the swipe and shows the next movie`, async ({ page, api }) => {
      await page.goto("/")
      await expect(cardTitle(page)).toHaveText("Test Movie 1")
      await visible(page, `button[title="${button}"]`).click()
      await expect(cardTitle(page)).not.toHaveText("Test Movie 1")
      const sent = api.requests("/interactions", "POST").at(-1)!
      expect(sent.body).toMatchObject({ tmdb_movie_id: 1, context: "swipe", ...payload })
      if (toast) await expect(page.getByText(toast)).toBeVisible()
    })
  }

  test("dragging the card right likes it", async ({ page, api }) => {
    await page.goto("/")
    await expect(cardTitle(page)).toHaveText("Test Movie 1")
    const card = page.locator("div.touch-none").first()
    const box = (await card.boundingBox())!
    const x = box.x + box.width / 2, y = box.y + box.height / 3
    await page.mouse.move(x, y)
    await page.mouse.down()
    for (let i = 1; i <= 10; i++) await page.mouse.move(x + i * 25, y)
    await page.mouse.up()
    await expect(cardTitle(page)).not.toHaveText("Test Movie 1")
    expect(api.requests("/interactions", "POST").at(-1)!.body).toMatchObject({ tmdb_movie_id: 1, status: "liked" })
  })

  test("tapping the card opens full details", async ({ page }) => {
    await page.goto("/")
    await expect(cardTitle(page)).toHaveText("Test Movie 1")
    const card = page.locator("div.touch-none").first()
    const box = (await card.boundingBox())!
    await page.mouse.click(box.x + 60, box.y + 60)
    await expect(page.getByText("Overview text for test movie 1.").last()).toBeVisible()
    await expect(page.getByRole("button", { name: /Watch Trailer/ }).last()).toBeVisible()
  })

  test("trailer opens in privacy-enhanced player and is counted", async ({ page, api }) => {
    await page.goto("/")
    await expect(cardTitle(page)).toHaveText("Test Movie 1")
    await visible(page, "button:has-text('Trailer')").click()
    const frame = page.locator("iframe")
    await expect(frame).toHaveAttribute("src", /youtube-nocookie\.com\/embed\/trailer1/)
    await expect.poll(() => api.requests("/events").map(r => r.body?.name)).toContain("trailer_play")
  })
})

test.describe("Undo", () => {
  test("undo is disabled until there is a swipe", async ({ page }) => {
    await page.goto("/")
    await expect(cardTitle(page)).toHaveText("Test Movie 1")
    await expect(visible(page, 'button[aria-label="Undo last swipe"]')).toBeDisabled()
  })

  test("undo brings back the previous film and keeps the displaced one next", async ({ page, api }) => {
    await page.goto("/")
    await expect(cardTitle(page)).toHaveText("Test Movie 1")
    await visible(page, 'button[title="Like"]').click()
    await expect(cardTitle(page)).not.toHaveText("Test Movie 1")
    const displaced = await cardTitle(page).innerText()

    await visible(page, 'button[aria-label="Undo last swipe"]').click()
    await expect(cardTitle(page)).toHaveText("Test Movie 1")
    await expect(page.getByText("Removed from liked")).toBeVisible()
    expect(api.requests("/interactions/undo").at(-1)!.body).toMatchObject({ tmdb_movie_id: 1, kind: "like", context: "swipe" })

    await visible(page, 'button[title="Skip"]').click()
    await expect(cardTitle(page)).toHaveText(displaced)
  })

  test("several swipes can be undone in a row", async ({ page }) => {
    await page.goto("/")
    await expect(cardTitle(page)).toHaveText("Test Movie 1")
    const seen = [await cardTitle(page).innerText()]
    for (let i = 0; i < 3; i++) {
      await visible(page, 'button[title="Skip"]').click()
      await expect(cardTitle(page)).not.toHaveText(seen.at(-1)!)
      seen.push(await cardTitle(page).innerText())
    }
    const undo = visible(page, 'button[aria-label="Undo last swipe"]')
    for (let i = 2; i >= 0; i--) {
      await undo.click()
      await expect(cardTitle(page)).toHaveText(seen[i])
    }
    await expect(undo).toBeDisabled()
  })
})
