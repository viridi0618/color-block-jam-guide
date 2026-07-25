import { test, expect } from "@playwright/test";

/**
 * E2E tests for persistent game session across level pages.
 *
 * Uses test-game.html (a local test page with a counter) as the embed URL
 * so tests do not depend on a real third-party game.
 *
 * Environment variables set in playwright.config.ts:
 *   NEXT_PUBLIC_ONLINE_GAME_ENABLED=true
 *   NEXT_PUBLIC_ONLINE_GAME_EMBED_URL=/test-game.html
 *   NEXT_PUBLIC_ONLINE_GAME_OPEN_URL=/test-game.html
 */

// The game iframe has title="Color Block Jam Online" and class "online-game-iframe"
const GAME_IFRAME = 'iframe[title="Color Block Jam Online"]';

test.describe("Persistent Game Session", () => {
  test("initial state: no game iframe on /level/16", async ({ page }) => {
    await page.goto("/level/16");
    await page.waitForSelector("h1");

    // No game iframe should exist yet (YouTube iframe may exist separately)
    const gameIframe = page.locator(GAME_IFRAME);
    await expect(gameIframe).toHaveCount(0);

    // Play Now button should be visible
    const playNow = page.getByRole("button", { name: "Play Now" });
    await expect(playNow).toBeVisible();
  });

  test("click Play Now creates game iframe", async ({ page }) => {
    await page.goto("/level/16");
    await page.waitForSelector("h1");

    await page.getByRole("button", { name: "Play Now" }).click();

    const gameIframe = page.locator(GAME_IFRAME);
    await expect(gameIframe).toHaveCount(1);
    await expect(gameIframe).toBeVisible();
  });

  test("iframe persists when navigating from /level/16 to /level/17", async ({
    page,
  }) => {
    await page.goto("/level/16");
    await page.waitForSelector("h1");

    // Click Play Now
    await page.getByRole("button", { name: "Play Now" }).click();
    await page.waitForSelector(GAME_IFRAME);

    // Increment counter in the test-game iframe to 3
    const gameFrame = page.frameLocator(GAME_IFRAME);
    for (let i = 0; i < 3; i++) {
      await gameFrame.getByRole("button", { name: "+1" }).click();
    }
    const counterBefore = await gameFrame.locator("#counter").textContent();
    expect(counterBefore).toBe("3");

    // Verify Play Now is NOT visible
    await expect(page.getByRole("button", { name: "Play Now" })).not.toBeVisible();

    // Click Next Level
    const nextLink = page.locator(".level-nav .next");
    await nextLink.click();

    // Verify URL changed to /level/17
    await page.waitForURL(/\/level\/17/);
    await page.waitForSelector("h1");

    // Game iframe should still exist
    const gameIframeAfter = page.locator(GAME_IFRAME);
    await expect(gameIframeAfter).toHaveCount(1);

    // Counter should still be 3 (iframe state preserved)
    const gameFrameAfter = page.frameLocator(GAME_IFRAME);
    const counterAfter = await gameFrameAfter.locator("#counter").textContent();
    expect(counterAfter).toBe("3");

    // Play Now should still NOT be visible
    await expect(page.getByRole("button", { name: "Play Now" })).not.toBeVisible();
  });

  test("iframe persists when navigating via Related Level", async ({
    page,
  }) => {
    await page.goto("/level/16");
    await page.waitForSelector("h1");

    await page.getByRole("button", { name: "Play Now" }).click();
    await page.waitForSelector(GAME_IFRAME);

    // Increment counter to 3
    const gameFrame = page.frameLocator(GAME_IFRAME);
    for (let i = 0; i < 3; i++) {
      await gameFrame.getByRole("button", { name: "+1" }).click();
    }

    // Click a Related Level link
    const relatedLink = page.locator(".related-level-link").first();
    await relatedLink.click();

    await page.waitForSelector("h1");

    // Game iframe should still exist
    const gameIframeAfter = page.locator(GAME_IFRAME);
    await expect(gameIframeAfter).toHaveCount(1);

    // Counter should still be 3
    const gameFrameAfter = page.frameLocator(GAME_IFRAME);
    const counterAfter = await gameFrameAfter.locator("#counter").textContent();
    expect(counterAfter).toBe("3");

    await expect(page.getByRole("button", { name: "Play Now" })).not.toBeVisible();
  });

  test("Reload Game button recreates iframe", async ({ page }) => {
    await page.goto("/level/16");
    await page.waitForSelector("h1");

    await page.getByRole("button", { name: "Play Now" }).click();
    await page.waitForSelector(GAME_IFRAME);

    // Increment counter to 3
    const gameFrame = page.frameLocator(GAME_IFRAME);
    for (let i = 0; i < 3; i++) {
      await gameFrame.getByRole("button", { name: "+1" }).click();
    }

    // Click Reload Game
    await page.getByRole("button", { name: "Reload Game" }).click();

    // Wait for iframe to reload
    await page.waitForTimeout(500);

    const gameIframeAfter = page.locator(GAME_IFRAME);
    await expect(gameIframeAfter).toHaveCount(1);

    // Counter should be reset to 0 (new iframe)
    const gameFrameAfter = page.frameLocator(GAME_IFRAME);
    const counterAfter = await gameFrameAfter.locator("#counter").textContent();
    expect(counterAfter).toBe("0");
  });

  test("Play Now not visible after navigation if game was started", async ({
    page,
  }) => {
    await page.goto("/level/16");
    await page.waitForSelector("h1");

    await page.getByRole("button", { name: "Play Now" }).click();
    await page.waitForSelector(GAME_IFRAME);

    // Navigate to /level/17
    await page.locator(".level-nav .next").click();
    await page.waitForURL(/\/level\/17/);
    await page.waitForSelector("h1");

    await expect(page.getByRole("button", { name: "Play Now" })).not.toBeVisible();
  });

  test("game iframe URL is not modified by levelId", async ({ page }) => {
    await page.goto("/level/16");
    await page.waitForSelector("h1");

    await page.getByRole("button", { name: "Play Now" }).click();
    await page.waitForSelector(GAME_IFRAME);

    const src = await page.locator(GAME_IFRAME).getAttribute("src");
    expect(src).not.toContain("16");
    expect(src).not.toContain("levelId");
    expect(src).toContain("test-game.html");
  });
});