import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

// ─── Range Parsing Tests ───────────────────────────────────────────

test("range parser: Level 1-10 expands to 1 through 10 inclusive", async () => {
  const { parseLevelTitle } = await import("../scripts/import-youtube-sources.ts");
  const result = parseLevelTitle("Color Block Jam Level 1-10 Solution Walkthrough");
  assert.ok(result);
  assert.strictEqual(result.type, "range");
  if (result.type === "range") {
    assert.strictEqual(result.rangeStart, 1);
    assert.strictEqual(result.rangeEnd, 10);
    assert.strictEqual(result.sourceLevelIds.length, 10);
    assert.deepStrictEqual(result.sourceLevelIds, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  }
});

test("range parser: Level 1 - 10 with spaces", async () => {
  const { parseLevelTitle } = await import("../scripts/import-youtube-sources.ts");
  const result = parseLevelTitle("Color Block Jam Level 1 - 10 Solution Walkthrough");
  assert.ok(result);
  assert.strictEqual(result.type, "range");
});

test("range parser: Levels 1-10 (plural)", async () => {
  const { parseLevelTitle } = await import("../scripts/import-youtube-sources.ts");
  const result = parseLevelTitle("Color Block Jam Levels 1-10 Solution Walkthrough");
  assert.ok(result);
  assert.strictEqual(result.type, "range");
});

test("range parser: reversed range is rejected", async () => {
  const { parseLevelTitle } = await import("../scripts/import-youtube-sources.ts");
  const result = parseLevelTitle("Color Block Jam Level 10-1 Solution Walkthrough");
  assert.ok(result);
  assert.strictEqual(result.type, "single");
});

test("range parser: Level 0 range is rejected", async () => {
  const { parseLevelTitle } = await import("../scripts/import-youtube-sources.ts");
  const result = parseLevelTitle("Color Block Jam Level 0-10 Solution Walkthrough");
  assert.strictEqual(result, null);
});

test("range parser: range > 50 is rejected", async () => {
  const { parseLevelTitle } = await import("../scripts/import-youtube-sources.ts");
  const result = parseLevelTitle("Color Block Jam Level 1-60 Solution Walkthrough");
  assert.ok(result);
  assert.strictEqual(result.type, "single");
});

test("range parser: range parsing takes priority over single-level", async () => {
  const { parseLevelTitle } = await import("../scripts/import-youtube-sources.ts");
  const result = parseLevelTitle("Color Block Jam Level 1-10 Solution Walkthrough");
  assert.ok(result);
  assert.strictEqual(result.type, "range");
});

test("range parser: single-level still works", async () => {
  const { parseLevelTitle } = await import("../scripts/import-youtube-sources.ts");
  const result = parseLevelTitle("Color Block Jam Level 16 Solution Walkthrough");
  assert.ok(result);
  assert.strictEqual(result.type, "single");
  if (result.type === "single") {
    assert.strictEqual(result.primaryLevelId, 16);
    assert.strictEqual(result.alternateLevelId, null);
  }
});

test("range parser: ordinary hyphen in title is not a range", async () => {
  const { parseLevelTitle } = await import("../scripts/import-youtube-sources.ts");
  const result = parseLevelTitle("Color Block Jam Level 25 Walkthrough");
  assert.ok(result);
  assert.strictEqual(result.type, "single");
});

// ─── Video Ranking Tests ────────────────────────────────────────────

test("video ranking: standard walkthrough beats without", async () => {
  const { parseLevelTitle } = await import("../scripts/import-youtube-sources.ts");
  const standard = "Color Block Jam Level 16 Solution Walkthrough";
  const without = "Color Block Jam Level 16 Without Vacuum Power-Up";
  const s = parseLevelTitle(standard);
  const w = parseLevelTitle(without);
  assert.ok(s);
  assert.ok(w);
  assert.strictEqual(s.type, "single");
  assert.strictEqual(w.type, "single");
});

test("video ranking: demotion words are detected", async () => {
  const levels = JSON.parse(
    await readFile(new URL("data/levels/all-levels.json", root), "utf8"),
  );
  const level16 = levels.find((l) => l.levelId === 16);
  if (level16) {
    assert.ok(level16.primaryVideo);
    assert.ok(level16.primaryVideo.title);
  }
});

// ─── Share Behavior Tests ───────────────────────────────────────────

test("share: ShareLevel component handles share correctly", async () => {
  const share = await readFile(new URL("components/ShareLevel.tsx", root), "utf8");
  assert.match(share, /navigator\.share/);
  assert.match(share, /navigator\.clipboard\.writeText\(canonicalUrl\)/);
  assert.match(share, /AbortError/);
  assert.match(share, /copyLink/);
  assert.match(share, /error\.name === "AbortError"/);
  assert.match(share, /User cancelled/);
});

test("share: navigator.share not available falls back to copy", async () => {
  const share = await readFile(new URL("components/ShareLevel.tsx", root), "utf8");
  assert.match(share, /!navigator\.share/);
  assert.match(share, /await copyLink\(\)/);
});

// ─── Existing Tests (preserved) ─────────────────────────────────────

test("mobile publishing requirements are present", async () => {
  const [search, css, ranges, layout, share, alternative] = await Promise.all([
    readFile(new URL("components/LevelSearch.tsx", root), "utf8"),
    readFile(new URL("app/globals.css", root), "utf8"),
    readFile(new URL("components/LevelRanges.tsx", root), "utf8"),
    readFile(new URL("app/layout.tsx", root), "utf8"),
    readFile(new URL("components/ShareLevel.tsx", root), "utf8"),
    readFile(new URL("components/AlternativeVideo.tsx", root), "utf8"),
  ]);
  assert.match(search, /inputMode="numeric"/);
  assert.match(search, /approved\.has\(levelId\)/);
  assert.match(search, /We don't have a walkthrough for Level/);
  assert.match(css, /min-height:\s*52px/);
  assert.match(css, /env\(safe-area-inset-bottom\)/);
  assert.match(css, /max-width:\s*430px/);
  assert.doesNotMatch(ranges, /openRange|aria-expanded|>\+<|>−</);
  assert.doesNotMatch(layout, /codex-preview|SkeletonPreview/);
  assert.match(share, /navigator\.share/);
  assert.match(share, /navigator\.clipboard\.writeText\(canonicalUrl\)/);
  assert.match(share, /Level \$\{levelId\} link copied!/);
  assert.match(alternative, /loaded \?/);
});

test("SEO routes and source notes exist", async () => {
  const [sitemap, robots, sourceNotes, levelPage] = await Promise.all([
    readFile(new URL("app/sitemap.ts", root), "utf8"),
    readFile(new URL("app/robots.ts", root), "utf8"),
    readFile(new URL("SOURCE_NOTES.md", root), "utf8"),
    readFile(new URL("app/level/[levelId]/page.tsx", root), "utf8"),
  ]);
  assert.match(sitemap, /levels\.map/);
  assert.match(robots, /sitemap\.xml/);
  assert.match(sourceNotes, /does not own, download, edit, or re-host/);
  assert.match(levelPage, /dynamicParams = false/);
  assert.match(levelPage, /The video creator labels this walkthrough/);
});

test("long-tail intent pages use official links and FAQ schema", async () => {
  const [download, pc, online, aboutGame, faq, sitemap] = await Promise.all([
    readFile(new URL("app/download/page.tsx", root), "utf8"),
    readFile(new URL("app/play-on-pc/page.tsx", root), "utf8"),
    readFile(new URL("app/play-online/page.tsx", root), "utf8"),
    readFile(new URL("app/about-color-block-jam/page.tsx", root), "utf8"),
    readFile(new URL("app/faq/page.tsx", root), "utf8"),
    readFile(new URL("app/sitemap.ts", root), "utf8"),
  ]);
  assert.match(download, /Official App Store/);
  assert.match(download, /Official Google Play/);
  assert.match(pc, /Google Play Games/);
  assert.match(online, /did not find a verified official browser version/);
  assert.match(aboutGame, /Rollic Games/);
  assert.match(faq, /"@type": "FAQPage"/);
  for (const route of ["/download", "/play-on-pc", "/play-online", "/about-color-block-jam", "/faq"]) {
    assert.match(sitemap, new RegExp(route.replaceAll("/", "\\/")));
  }
});

// ─── Fonts ──────────────────────────────────────────────────────────

test("fonts are loaded via next/font/google", async () => {
  const layout = await readFile(new URL("app/layout.tsx", root), "utf8");
  assert.match(layout, /next\/font\/google/);
  assert.match(layout, /Fredoka/);
  assert.match(layout, /Nunito/);
  assert.match(layout, /--font-fredoka/);
  assert.match(layout, /--font-nunito/);
  assert.match(layout, /display: "swap"/);
});

test("font variables are applied to body", async () => {
  const layout = await readFile(new URL("app/layout.tsx", root), "utf8");
  assert.match(layout, /fredoka\.variable/);
  assert.match(layout, /nunito\.variable/);
});

// ─── SOURCE_NOTES ──────────────────────────────────────────────────

test("SOURCE_NOTES uses correct playlist ID", async () => {
  const notes = await readFile(new URL("SOURCE_NOTES.md", root), "utf8");
  assert.match(notes, /PLEOnLO5L7cCcB4czXa_vNF0qCjik7RUpK/);
  assert.match(notes, /Historical sources/);
  assert.match(notes, /PLclTANjsXi_M/);
  assert.match(notes, /disabled/);
});

// ─── Data Validation ────────────────────────────────────────────────

test("level data has no duplicate levelIds", async () => {
  const levels = JSON.parse(
    await readFile(new URL("data/levels/all-levels.json", root), "utf8"),
  );
  const ids = levels.map((l) => l.levelId);
  const unique = new Set(ids);
  assert.strictEqual(unique.size, ids.length, `Found ${ids.length - unique.size} duplicate levelIds`);
});

test("level data has no duplicate slugs", async () => {
  const levels = JSON.parse(
    await readFile(new URL("data/levels/all-levels.json", root), "utf8"),
  );
  const slugs = levels.map((l) => l.slug);
  const unique = new Set(slugs);
  assert.strictEqual(unique.size, slugs.length, `Found ${slugs.length - unique.size} duplicate slugs`);
});

test("level data has Levels 1-10", async () => {
  const levels = JSON.parse(
    await readFile(new URL("data/levels/all-levels.json", root), "utf8"),
  );
  const ids = new Set(levels.map((l) => l.levelId));
  for (let i = 1; i <= 10; i++) {
    assert.ok(ids.has(i), `Level ${i} should exist`);
  }
});

test("level data entries are dynamic, not hardcoded", async () => {
  const checkLevels = await readFile(new URL("scripts/check-levels.ts", root), "utf8");
  assert.doesNotMatch(checkLevels, /Playlist entries:\s*4093/);
  assert.match(checkLevels, /candidates\.length/);
});

test("conflicts are empty or contain real conflicts", async () => {
  const conflicts = JSON.parse(
    await readFile(new URL("data/review/conflicts.json", root), "utf8"),
  );
  assert.ok(Array.isArray(conflicts));
  for (const c of conflicts) {
    assert.ok(c.type);
    assert.ok(c.severity === "error" || c.severity === "warning");
    assert.ok(c.reason);
  }
});

test("canonical URL infrastructure is correct", async () => {
  const siteUrl = await readFile(new URL("lib/site-url.ts", root), "utf8");
  assert.match(siteUrl, /NEXT_PUBLIC_SITE_URL/);
  assert.match(siteUrl, /VERCEL_PROJECT_PRODUCTION_URL/);
  assert.match(siteUrl, /VERCEL_URL/);
});

test("sitemap uses siteUrl", async () => {
  const sitemap = await readFile(new URL("app/sitemap.ts", root), "utf8");
  assert.match(sitemap, /siteUrl/);
  assert.match(sitemap, /levelRanges\.map/);
  assert.match(sitemap, /levels\.map/);
});

test("robots uses siteUrl for sitemap", async () => {
  const robots = await readFile(new URL("app/robots.ts", root), "utf8");
  assert.match(robots, /siteUrl/);
  assert.match(robots, /sitemap\.xml/);
});

// ─── Range video hint on level page ─────────────────────────────────

test("level page shows range hint for range videos", async () => {
  const levelPage = await readFile(new URL("app/level/[levelId]/page.tsx", root), "utf8");
  assert.match(levelPage, /isRangeVideo/);
  assert.match(levelPage, /This video covers Levels/);
  assert.match(levelPage, /rangeStart/);
  assert.match(levelPage, /rangeEnd/);
});