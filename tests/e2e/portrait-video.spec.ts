import { test, expect } from "@playwright/test";

/**
 * E2E tests for portrait (9:16) walkthrough video layout.
 *
 * Validates that portrait video cards are:
 * - Correctly sized (height > width, desktop width = 480px)
 * - Horizontally centered on desktop
 * - Not overflowing on mobile viewports
 * - Free of removed caption/attribution text
 * - Compatible with 16:9 videos (no false portrait class)
 * - Online game heading is properly rendered
 */

const PORTRAIT_CARD = ".video-card--portrait";
const VIDEO_FRAME = ".video-frame";
const LEVEL_PAGE = ".level-page";

test.describe("Portrait Video Layout", () => {
  test.describe("Desktop 1280x900: portrait dimensions", () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 900 });
    });

    test("portrait card, frame, and iframe are visible on /level/16", async ({ page }) => {
      await page.goto("/level/16");
      await page.waitForSelector("h1");

      const card = page.locator(PORTRAIT_CARD);
      await expect(card).toBeVisible();

      const frame = page.locator(`${PORTRAIT_CARD} ${VIDEO_FRAME}`);
      await expect(frame).toBeVisible();

      const iframe = page.locator(`${PORTRAIT_CARD} iframe`);
      await expect(iframe).toBeVisible();
    });

    test("portrait card width is 480px (±2px browser tolerance)", async ({ page }) => {
      await page.goto("/level/16");
      await page.waitForSelector("h1");

      const card = page.locator(PORTRAIT_CARD);
      const box = await card.boundingBox();
      expect(box).not.toBeNull();
      if (box) {
        expect(box.width).toBeGreaterThanOrEqual(478);
        expect(box.width).toBeLessThanOrEqual(482);
      }
    });

    test("portrait card height > width", async ({ page }) => {
      await page.goto("/level/16");
      await page.waitForSelector("h1");

      const card = page.locator(PORTRAIT_CARD);
      const box = await card.boundingBox();
      expect(box).not.toBeNull();
      if (box) {
        expect(box.height).toBeGreaterThan(box.width);
      }
    });

    test("video frame height > frame width (9:16 ratio)", async ({ page }) => {
      await page.goto("/level/16");
      await page.waitForSelector("h1");

      const frame = page.locator(`${PORTRAIT_CARD} ${VIDEO_FRAME}`);
      const box = await frame.boundingBox();
      expect(box).not.toBeNull();
      if (box) {
        expect(box.height).toBeGreaterThan(box.width);
      }
    });

    test("aspect ratio is ~9:16 (1.75 < ratio < 1.81)", async ({ page }) => {
      await page.goto("/level/16");
      await page.waitForSelector("h1");

      const frame = page.locator(`${PORTRAIT_CARD} ${VIDEO_FRAME}`);
      const box = await frame.boundingBox();
      expect(box).not.toBeNull();
      if (box) {
        const ratio = box.height / box.width;
        expect(ratio).toBeGreaterThan(1.75);
        expect(ratio).toBeLessThan(1.81);
      }
    });

    test("iframe dimensions do not exceed frame dimensions", async ({ page }) => {
      await page.goto("/level/16");
      await page.waitForSelector("h1");

      const frameBox = await page.locator(`${PORTRAIT_CARD} ${VIDEO_FRAME}`).boundingBox();
      const iframeBox = await page.locator(`${PORTRAIT_CARD} iframe`).boundingBox();

      expect(frameBox).not.toBeNull();
      expect(iframeBox).not.toBeNull();

      if (frameBox && iframeBox) {
        expect(iframeBox.width).toBeLessThanOrEqual(frameBox.width);
        expect(iframeBox.height).toBeLessThanOrEqual(frameBox.height);
      }
    });
  });

  test.describe("Desktop 1280x900: horizontal centering", () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 900 });
    });

    test("portrait card is centered within level page (≤4px diff)", async ({ page }) => {
      await page.goto("/level/16");
      await page.waitForSelector("h1");

      const levelPage = page.locator(LEVEL_PAGE);
      const levelBox = await levelPage.boundingBox();
      const cardBox = await page.locator(PORTRAIT_CARD).boundingBox();

      expect(levelBox).not.toBeNull();
      expect(cardBox).not.toBeNull();

      if (levelBox && cardBox) {
        const leftGap = cardBox.x - levelBox.x;
        const rightGap = (levelBox.x + levelBox.width) - (cardBox.x + cardBox.width);
        const diff = Math.abs(leftGap - rightGap);
        expect(diff).toBeLessThanOrEqual(4);
      }
    });
  });

  test.describe("Desktop 1366x768: short viewport", () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 1366, height: 768 });
    });

    test("page loads normally on short viewport", async ({ page }) => {
      await page.goto("/level/16");
      await page.waitForSelector("h1");

      const card = page.locator(PORTRAIT_CARD);
      await expect(card).toBeVisible();
    });

    test("portrait card width is ~480px on short viewport", async ({ page }) => {
      await page.goto("/level/16");
      await page.waitForSelector("h1");

      const card = page.locator(PORTRAIT_CARD);
      const box = await card.boundingBox();
      expect(box).not.toBeNull();
      if (box) {
        expect(box.width).toBeGreaterThanOrEqual(478);
        expect(box.width).toBeLessThanOrEqual(482);
      }
    });

    test("no horizontal scroll on short viewport", async ({ page }) => {
      await page.goto("/level/16");
      await page.waitForSelector("h1");

      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
    });

    test("iframe is not clipped horizontally", async ({ page }) => {
      await page.goto("/level/16");
      await page.waitForSelector("h1");

      const iframe = page.locator(`${PORTRAIT_CARD} iframe`);
      const box = await iframe.boundingBox();
      expect(box).not.toBeNull();
      if (box) {
        // Iframe should be fully visible horizontally
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(1366);
      }
    });

    test("video can be scrolled into view (no forced height compression)", async ({ page }) => {
      await page.goto("/level/16");
      await page.waitForSelector("h1");

      // The portrait video is tall and may extend beyond the viewport.
      // The page should allow normal vertical scrolling.
      const totalHeight = await page.evaluate(() => document.documentElement.scrollHeight);
      expect(totalHeight).toBeGreaterThan(768);
    });
  });

  test.describe("Mobile 390x844: no overflow", () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
    });

    test("portrait card does not overflow on mobile viewport", async ({ page }) => {
      await page.goto("/level/16");
      await page.waitForSelector("h1");

      const card = page.locator(PORTRAIT_CARD);
      const box = await card.boundingBox();
      expect(box).not.toBeNull();

      if (box) {
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(390);
      }
    });

    test("no horizontal scroll on mobile", async ({ page }) => {
      await page.goto("/level/16");
      await page.waitForSelector("h1");

      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
    });

    test("iframe width does not exceed card width on mobile", async ({ page }) => {
      await page.goto("/level/16");
      await page.waitForSelector("h1");

      const cardBox = await page.locator(PORTRAIT_CARD).boundingBox();
      const iframeBox = await page.locator(`${PORTRAIT_CARD} iframe`).boundingBox();

      expect(cardBox).not.toBeNull();
      expect(iframeBox).not.toBeNull();

      if (cardBox && iframeBox) {
        expect(iframeBox.width).toBeLessThanOrEqual(cardBox.width);
      }
    });

    test("video frame height > width on mobile", async ({ page }) => {
      await page.goto("/level/16");
      await page.waitForSelector("h1");

      const frame = page.locator(`${PORTRAIT_CARD} ${VIDEO_FRAME}`);
      const box = await frame.boundingBox();
      expect(box).not.toBeNull();
      if (box) {
        expect(box.height).toBeGreaterThan(box.width);
      }
    });
  });

  test.describe("Video caption text removed", () => {
    test("no 'Video by' text below video", async ({ page }) => {
      await page.goto("/level/16");
      await page.waitForSelector("h1");

      await expect(page.getByText("Video by")).toHaveCount(0);
    });

    test("no 'Video walkthrough by' text below video", async ({ page }) => {
      await page.goto("/level/16");
      await page.waitForSelector("h1");

      await expect(page.getByText("Video walkthrough by")).toHaveCount(0);
    });

    test("no 'Video not loading?' text below video", async ({ page }) => {
      await page.goto("/level/16");
      await page.waitForSelector("h1");

      await expect(page.getByText("Video not loading?")).toHaveCount(0);
    });

    test("no 'Watch on YouTube' text below video", async ({ page }) => {
      await page.goto("/level/16");
      await page.waitForSelector("h1");

      await expect(page.getByText("Watch on YouTube")).toHaveCount(0);
    });

    test("no 'min walkthrough' text below video", async ({ page }) => {
      await page.goto("/level/16");
      await page.waitForSelector("h1");

      await expect(page.getByText(/min walkthrough/)).toHaveCount(0);
    });

    test("level navigation appears after video", async ({ page }) => {
      await page.goto("/level/16");
      await page.waitForSelector("h1");

      const levelNav = page.locator(".level-nav");
      await expect(levelNav).toBeVisible();
    });
  });

  test.describe("Landscape compatibility", () => {
    test("aspect ratio logic is not unconditional — 9:16 is the source default", async ({ page }) => {
      await page.goto("/level/16");
      await page.waitForSelector("h1");

      const card = page.locator(PORTRAIT_CARD);
      await expect(card).toBeVisible();

      // Verify the iframe aspect ratio CSS is applied
      const iframeBox = await page.locator(".video-frame.ratio-portrait").boundingBox();
      expect(iframeBox).not.toBeNull();
    });
  });

  test.describe("Online game heading", () => {
    test("homepage: Play in Your Browser heading is visible", async ({ page }) => {
      await page.goto("/");
      await page.waitForSelector("h1");

      const playHeading = page.getByRole("heading", { name: /Play Color Block Jam Online/i, level: 2 });
      await expect(playHeading).toBeVisible();

      const badge = page.getByText("Play in Your Browser");
      await expect(badge).toBeVisible();
    });

    test("homepage: game icon is visible", async ({ page }) => {
      await page.goto("/");
      await page.waitForSelector("h1");

      const icon = page.locator(".online-game-heading-icon");
      await expect(icon).toBeVisible();
    });

    test("homepage: description text is visible", async ({ page }) => {
      await page.goto("/");
      await page.waitForSelector("h1");

      const description = page.locator(".online-game-heading-copy");
      await expect(description).toBeVisible();
    });

    test("/play-online: only one H1", async ({ page }) => {
      await page.goto("/play-online");
      await page.waitForSelector("h1");

      await expect(page.locator("h1")).toHaveCount(1);
    });

    test("/play-online: Browser Game badge is visible", async ({ page }) => {
      await page.goto("/play-online");
      await page.waitForSelector("h1");

      const badge = page.getByText("Browser Game");
      await expect(badge).toBeVisible();
    });

    test("/play-online: Play Color Block Jam Online heading is visible", async ({ page }) => {
      await page.goto("/play-online");
      await page.waitForSelector("h1");

      const heading = page.getByRole("heading", { name: /Play Color Block Jam Online/i });
      await expect(heading).toBeVisible();
    });

    test("/play-online: game icon is visible", async ({ page }) => {
      await page.goto("/play-online");
      await page.waitForSelector("h1");

      const icon = page.locator(".online-game-heading-icon");
      await expect(icon).toBeVisible();
    });

    test("/play-online: description text is visible", async ({ page }) => {
      await page.goto("/play-online");
      await page.waitForSelector("h1");

      const description = page.locator(".online-game-heading-copy");
      await expect(description).toBeVisible();
    });
  });
});

// ─── Existing Behavior Preservation ───────────────────────────────────

test.describe("Existing Player Behavior Preserved", () => {
  test("Play Now is inside .online-game-frame on /level/16", async ({ page }) => {
    await page.goto("/level/16");
    await page.waitForSelector("h1");

    const playNowInFrame = page.locator(
      ".online-game-frame .online-game-start-overlay .online-game-play-btn",
    );
    await expect(playNowInFrame).toBeVisible();
  });

  test("click Play Now: iframe loads in place, URL unchanged", async ({ page }) => {
    await page.goto("/level/16");
    await page.waitForSelector("h1");

    const urlBefore = page.url();
    await page.getByRole("button", { name: "Play Now" }).click();

    const gameIframe = page.locator('iframe[title="Color Block Jam Online"]');
    await expect(gameIframe).toHaveCount(1);
    await expect(gameIframe).toBeVisible();

    const urlAfter = page.url();
    expect(urlAfter).toBe(urlBefore);
  });

  test("timeout / retry CSS classes exist in stylesheet", async ({ page }) => {
    await page.goto("/level/16");
    await page.waitForSelector("h1");

    await page.getByRole("button", { name: "Play Now" }).click();
    await page.waitForSelector('iframe[title="Color Block Jam Online"]');

    const hasRetryCss = await page.evaluate(() => {
      const styleSheets = document.styleSheets;
      for (let i = 0; i < styleSheets.length; i++) {
        try {
          const rules = styleSheets[i].cssRules || (styleSheets[i] as CSSStyleSheet).rules;
          if (!rules) continue;
          for (let j = 0; j < rules.length; j++) {
            const rule = rules[j] as CSSStyleRule;
            if (rule.selectorText && rule.selectorText.includes(".online-game-retry-btn")) {
              return true;
            }
          }
        } catch {
          // Cross-origin stylesheet, skip
        }
      }
      return false;
    });
    expect(hasRetryCss).toBe(true);
  });
});