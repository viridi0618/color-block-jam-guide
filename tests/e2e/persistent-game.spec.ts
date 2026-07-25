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

// Install analytics mock before each test
function analyticsMockScript() {
  return `window.__trackedEvents = [];
window.gtag = function() {
  window.__trackedEvents.push(Array.from(arguments));
};`;
}

async function getTrackedEvents(page: { evaluate: (fn: () => unknown) => Promise<unknown> }): Promise<unknown[]> {
  const result = await page.evaluate(() => {
    const w = window as unknown as { __trackedEvents?: unknown[] };
    return w.__trackedEvents ?? [];
  });
  return result as unknown[];
}

test.describe("Persistent Game Session", () => {
  test("initial state: no game iframe on /level/16", async ({ page }) => {
    await page.goto("/level/16");
    await page.waitForSelector("h1");

    const gameIframe = page.locator(GAME_IFRAME);
    await expect(gameIframe).toHaveCount(0);

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

    await page.getByRole("button", { name: "Play Now" }).click();
    await page.waitForSelector(GAME_IFRAME);

    const gameFrame = page.frameLocator(GAME_IFRAME);
    for (let i = 0; i < 3; i++) {
      await gameFrame.getByRole("button", { name: "+1" }).click();
    }
    const counterBefore = await gameFrame.locator("#counter").textContent();
    expect(counterBefore).toBe("3");

    await expect(page.getByRole("button", { name: "Play Now" })).not.toBeVisible();

    const nextLink = page.locator(".level-nav .next");
    await nextLink.click();

    await page.waitForURL(/\/level\/17/);
    await page.waitForSelector("h1");

    const gameIframeAfter = page.locator(GAME_IFRAME);
    await expect(gameIframeAfter).toHaveCount(1);

    const gameFrameAfter = page.frameLocator(GAME_IFRAME);
    const counterAfter = await gameFrameAfter.locator("#counter").textContent();
    expect(counterAfter).toBe("3");

    await expect(page.getByRole("button", { name: "Play Now" })).not.toBeVisible();
  });

  test("iframe persists when navigating via Related Level", async ({
    page,
  }) => {
    await page.goto("/level/16");
    await page.waitForSelector("h1");

    await page.getByRole("button", { name: "Play Now" }).click();
    await page.waitForSelector(GAME_IFRAME);

    const gameFrame = page.frameLocator(GAME_IFRAME);
    for (let i = 0; i < 3; i++) {
      await gameFrame.getByRole("button", { name: "+1" }).click();
    }

    const relatedLink = page.locator(".related-level-link").first();
    await relatedLink.click();

    await page.waitForSelector("h1");

    const gameIframeAfter = page.locator(GAME_IFRAME);
    await expect(gameIframeAfter).toHaveCount(1);

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

    const gameFrame = page.frameLocator(GAME_IFRAME);
    for (let i = 0; i < 3; i++) {
      await gameFrame.getByRole("button", { name: "+1" }).click();
    }

    await page.getByRole("button", { name: "Reload Game" }).click();

    await page.waitForTimeout(500);

    const gameIframeAfter = page.locator(GAME_IFRAME);
    await expect(gameIframeAfter).toHaveCount(1);

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

// ─── Analytics E2E Tests ─────────────────────────────────────────────

test.describe("Analytics Events", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript({ content: analyticsMockScript() });
  });

  test("game_start does not repeat across navigation", async ({ page }) => {
    await page.goto("/level/16");
    await page.waitForSelector("h1");

    await page.getByRole("button", { name: "Play Now" }).click();
    await page.waitForSelector(GAME_IFRAME);

    let events = await getTrackedEvents(page);
    const gameStartCount = events.filter(
      (e: unknown) => (e as [string, string])[0] === "event" && (e as [string, string, unknown])[1] === "game_start",
    ).length;
    expect(gameStartCount).toBe(1);

    // Navigate to /level/17
    await page.locator(".level-nav .next").click();
    await page.waitForURL(/\/level\/17/);
    await page.waitForSelector("h1");

    events = await getTrackedEvents(page);
    const gameStartCount2 = events.filter(
      (e: unknown) => (e as [string, string])[0] === "event" && (e as [string, string, unknown])[1] === "game_start",
    ).length;
    expect(gameStartCount2).toBe(1);

    // Navigate via Related Level
    const relatedLink = page.locator(".related-level-link").first();
    await relatedLink.click();
    await page.waitForSelector("h1");

    events = await getTrackedEvents(page);
    const gameStartCount3 = events.filter(
      (e: unknown) => (e as [string, string])[0] === "event" && (e as [string, string, unknown])[1] === "game_start",
    ).length;
    expect(gameStartCount3).toBe(1);
  });

  test("play_online_from_level does not repeat across navigation", async ({
    page,
  }) => {
    await page.goto("/level/16");
    await page.waitForSelector("h1");

    await page.getByRole("button", { name: "Play Now" }).click();
    await page.waitForSelector(GAME_IFRAME);

    let events = await getTrackedEvents(page);
    const levelStartCount = events.filter(
      (e: unknown) => (e as [string, string])[0] === "event" && (e as [string, string, unknown])[1] === "play_online_from_level",
    ).length;
    expect(levelStartCount).toBe(1);

    await page.locator(".level-nav .next").click();
    await page.waitForURL(/\/level\/17/);
    await page.waitForSelector("h1");

    events = await getTrackedEvents(page);
    const levelStartCount2 = events.filter(
      (e: unknown) => (e as [string, string])[0] === "event" && (e as [string, string, unknown])[1] === "play_online_from_level",
    ).length;
    expect(levelStartCount2).toBe(1);
  });

  test("source_level is correct in analytics", async ({ page }) => {
    await page.goto("/level/16");
    await page.waitForSelector("h1");

    await page.getByRole("button", { name: "Play Now" }).click();
    await page.waitForSelector(GAME_IFRAME);

    let events = await getTrackedEvents(page);
    const gameStartEvent = events.find(
      (e: unknown) => (e as [string, string])[0] === "event" && (e as [string, string, unknown])[1] === "game_start",
    ) as [string, string, Record<string, unknown>] | undefined;
    expect(gameStartEvent?.[2]?.source_level).toBe(16);

    // Navigate to /level/17 and click Reload
    await page.locator(".level-nav .next").click();
    await page.waitForURL(/\/level\/17/);
    await page.waitForSelector("h1");

    await page.getByRole("button", { name: "Reload Game" }).click();

    events = await getTrackedEvents(page);
    const reloadEvent = events.find(
      (e: unknown) => (e as [string, string])[0] === "event" && (e as [string, string, unknown])[1] === "game_reload",
    ) as [string, string, Record<string, unknown>] | undefined;
    expect(reloadEvent?.[2]?.source_level).toBe(17);
  });

  test("walkthrough_search_from_play_page fires on valid search", async ({
    page,
  }) => {
    await page.goto("/play-online");
    await page.waitForSelector("h1");

    // Type a valid level number
    await page.getByPlaceholder("Enter your level number").fill("16");
    await page.getByRole("button", { name: "Find My Walkthrough" }).click();

    // Wait for navigation
    await page.waitForURL(/\/level\/16/);

    const events = await getTrackedEvents(page);
    const searchEvent = events.find(
      (e: unknown) => (e as [string, string])[0] === "event" && (e as [string, string, unknown])[1] === "walkthrough_search_from_play_page",
    ) as [string, string, Record<string, unknown>] | undefined;
    expect(searchEvent).toBeTruthy();
    expect(searchEvent?.[2]?.source_page).toBe("play_online");
    expect(searchEvent?.[2]?.target_level).toBe(16);
  });

  test("walkthrough_search_from_play_page does not fire on invalid input", async ({
    page,
  }) => {
    await page.goto("/play-online");
    await page.waitForSelector("h1");

    // Type an invalid level number
    await page.getByPlaceholder("Enter your level number").fill("abc");
    await page.getByRole("button", { name: "Find My Walkthrough" }).click();

    // Should stay on same page
    await page.waitForTimeout(500);

    const events = await getTrackedEvents(page);
    const searchEvent = events.find(
      (e: unknown) => (e as [string, string])[0] === "event" && (e as [string, string, unknown])[1] === "walkthrough_search_from_play_page",
    );
    expect(searchEvent).toBeFalsy();
  });

  test("play_online_view fires on /play-online", async ({ page }) => {
    await page.goto("/play-online");
    await page.waitForSelector("h1");
    // Give useEffect in PlayOnlineViewTracker time to fire
    await page.waitForTimeout(300);

    const events = await getTrackedEvents(page);
    const viewEvent = events.find(
      (e: unknown) => (e as [string, string])[0] === "event" && (e as [string, string, unknown])[1] === "play_online_view",
    ) as [string, string, Record<string, unknown>] | undefined;
    expect(viewEvent).toBeTruthy();
    expect(viewEvent?.[2]?.source_page).toBe("play_online");
  });

  test("play_online_from_home fires on homepage Play Online click", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForSelector("h1");

    // Target the primary card button (class="primary-button"), not the footer or other links
    await page.locator('.play-online-home-card a.primary-button').click();

    await page.waitForURL(/\/play-online/);

    const events = await getTrackedEvents(page);
    const homeEvent = events.find(
      (e: unknown) => (e as [string, string])[0] === "event" && (e as [string, string, unknown])[1] === "play_online_from_home",
    ) as [string, string, Record<string, unknown>] | undefined;
    expect(homeEvent).toBeTruthy();
    expect(homeEvent?.[2]?.source_page).toBe("home");
  });
});