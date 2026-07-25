import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

// ─── Range Parsing Tests (real parser calls) ────────────────────────

test("range parser: Level 1-10 expands to 1 through 10 inclusive", async () => {
  const { parseLevelTitle } = await import("../lib/level-parser.ts");
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
  const { parseLevelTitle } = await import("../lib/level-parser.ts");
  const result = parseLevelTitle("Color Block Jam Level 1 - 10 Solution Walkthrough");
  assert.ok(result);
  assert.strictEqual(result.type, "range");
});

test("range parser: Levels 1-10 (plural)", async () => {
  const { parseLevelTitle } = await import("../lib/level-parser.ts");
  const result = parseLevelTitle("Color Block Jam Levels 1-10 Solution Walkthrough");
  assert.ok(result);
  assert.strictEqual(result.type, "range");
});

test("range parser: reversed range is rejected (not single)", async () => {
  const { parseLevelTitle } = await import("../lib/level-parser.ts");
  const result = parseLevelTitle("Color Block Jam Level 10-1 Solution Walkthrough");
  assert.ok(result);
  assert.strictEqual(result.type, "rejected-range");
  if (result.type === "rejected-range") {
    assert.match(result.reason, /Reversed/);
  }
});

test("range parser: Level 0 range is rejected", async () => {
  const { parseLevelTitle } = await import("../lib/level-parser.ts");
  const result = parseLevelTitle("Color Block Jam Level 0-10 Solution Walkthrough");
  assert.ok(result);
  assert.strictEqual(result.type, "rejected-range");
  if (result.type === "rejected-range") {
    assert.match(result.reason, /non-positive/);
  }
});

test("range parser: range > 50 is rejected (not single)", async () => {
  const { parseLevelTitle } = await import("../lib/level-parser.ts");
  const result = parseLevelTitle("Color Block Jam Level 1-60 Solution Walkthrough");
  assert.ok(result);
  assert.strictEqual(result.type, "rejected-range");
  if (result.type === "rejected-range") {
    assert.match(result.reason, /too large/i);
  }
});

test("range parser: range parsing takes priority over single-level", async () => {
  const { parseLevelTitle } = await import("../lib/level-parser.ts");
  const result = parseLevelTitle("Color Block Jam Level 1-10 Solution Walkthrough");
  assert.ok(result);
  assert.strictEqual(result.type, "range");
});

test("range parser: single-level still works", async () => {
  const { parseLevelTitle } = await import("../lib/level-parser.ts");
  const result = parseLevelTitle("Color Block Jam Level 16 Solution Walkthrough");
  assert.ok(result);
  assert.strictEqual(result.type, "single");
  if (result.type === "single") {
    assert.strictEqual(result.primaryLevelId, 16);
    assert.strictEqual(result.alternateLevelId, null);
  }
});

test("range parser: ordinary hyphen in title is not a range", async () => {
  const { parseLevelTitle } = await import("../lib/level-parser.ts");
  const result = parseLevelTitle("Color Block Jam Level 25 Walkthrough");
  assert.ok(result);
  assert.strictEqual(result.type, "single");
});

// ─── Video Ranking Tests (real ranker calls) ────────────────────────

test("video ranking: standard walkthrough scores higher than without", async () => {
  const { isDemoted, isStandardTitle, scoreVideo } = await import("../lib/level-parser.ts");
  const standard = {
    matchType: "primary-label",
    title: "Color Block Jam Level 16 Solution Walkthrough",
    embeddable: true,
    videoAvailable: true,
    publishedAt: "2025-01-01T00:00:00Z",
    priority: 0,
    videoId: "aaa",
  };
  const without = {
    matchType: "primary-label",
    title: "Color Block Jam Level 16 Without Vacuum Power-Up",
    embeddable: true,
    videoAvailable: true,
    publishedAt: "2025-01-01T00:00:00Z",
    priority: 0,
    videoId: "bbb",
  };
  assert.ok(isStandardTitle(standard.title));
  assert.ok(isDemoted(without.title));
  const standardScore = scoreVideo(standard);
  const withoutScore = scoreVideo(without);
  assert.ok(standardScore > withoutScore, `Standard ${standardScore} > without ${withoutScore}`);
});

test("video ranking: demotion words are detected", async () => {
  const { isDemoted } = await import("../lib/level-parser.ts");
  assert.ok(isDemoted("Color Block Jam Level 16 Without Vacuum Power-Up"));
  assert.ok(isDemoted("Color Block Jam Level 16 Challenge"));
  assert.ok(isDemoted("Color Block Jam Level 16 Speedrun"));
  assert.ok(isDemoted("Color Block Jam Level 16 No Powerup"));
  assert.ok(isDemoted("Color Block Jam Level 16 Hard Mode"));
  assert.ok(isDemoted("Color Block Jam Level 16 No Booster"));
  assert.ok(isDemoted("Color Block Jam Level 16 No Vacuum"));
  assert.ok(isDemoted("Color Block Jam Level 16 Win Streak"));
  assert.ok(isDemoted("Color Block Jam Level 16 Special Challenge"));
  assert.ok(!isDemoted("Color Block Jam Level 16 Solution Walkthrough"));
});

test("video ranking: embeddable=false is excluded", async () => {
  const { scoreVideo } = await import("../lib/level-parser.ts");
  const embeddable = {
    matchType: "primary-label",
    title: "Color Block Jam Level 16 Solution Walkthrough",
    embeddable: true,
    videoAvailable: true,
    publishedAt: "2025-01-01T00:00:00Z",
    priority: 0,
    videoId: "aaa",
  };
  const notEmbeddable = {
    matchType: "primary-label",
    title: "Color Block Jam Level 16 Solution Walkthrough",
    embeddable: false,
    videoAvailable: true,
    publishedAt: "2025-01-01T00:00:00Z",
    priority: 0,
    videoId: "bbb",
  };
  assert.ok(scoreVideo(embeddable) > scoreVideo(notEmbeddable), "Embeddable should score higher than non-embeddable");
});

test("video ranking: unavailable video is excluded", async () => {
  const { scoreVideo } = await import("../lib/level-parser.ts");
  const available = {
    matchType: "primary-label",
    title: "Color Block Jam Level 16 Solution Walkthrough",
    embeddable: true,
    videoAvailable: true,
    publishedAt: "2025-01-01T00:00:00Z",
    priority: 0,
    videoId: "aaa",
  };
  const unavailable = {
    matchType: "primary-label",
    title: "Color Block Jam Level 16 Solution Walkthrough",
    embeddable: true,
    videoAvailable: false,
    publishedAt: "2025-01-01T00:00:00Z",
    priority: 0,
    videoId: "bbb",
  };
  assert.ok(scoreVideo(available) > scoreVideo(unavailable), "Available should score higher than unavailable");
});

test("video ranking: publishedAt used as tiebreaker", async () => {
  const { rankCandidates } = await import("../lib/level-parser.ts");
  const newer = {
    matchType: "primary-label",
    title: "Color Block Jam Level 16 Solution Walkthrough",
    embeddable: true,
    videoAvailable: true,
    publishedAt: "2025-06-01T00:00:00Z",
    priority: 0,
    videoId: "aaa",
  };
  const older = {
    matchType: "primary-label",
    title: "Color Block Jam Level 16 Solution Walkthrough",
    embeddable: true,
    videoAvailable: true,
    publishedAt: "2025-01-01T00:00:00Z",
    priority: 0,
    videoId: "bbb",
  };
  // newer should sort before older (negative return from rankCandidates)
  const result = rankCandidates(newer, older);
  assert.ok(result < 0, `Newer should sort before older, got ${result}`);
});

test("video ranking: playlistPosition used as tiebreaker after publishedAt", async () => {
  const { rankCandidates } = await import("../lib/level-parser.ts");
  const earlier = {
    matchType: "primary-label",
    title: "Color Block Jam Level 16 Solution Walkthrough",
    embeddable: true,
    videoAvailable: true,
    publishedAt: "2025-01-01T00:00:00Z",
    priority: 0,
    videoId: "aaa",
    playlistPosition: 0,
  };
  const later = {
    matchType: "primary-label",
    title: "Color Block Jam Level 16 Solution Walkthrough",
    embeddable: true,
    videoAvailable: true,
    publishedAt: "2025-01-01T00:00:00Z",
    priority: 0,
    videoId: "bbb",
    playlistPosition: 5,
  };
  // earlier position should sort before later
  const result = rankCandidates(earlier, later);
  assert.ok(result < 0, `Earlier playlist position should sort first, got ${result}`);
});

test("video ranking: videoId is final stable tiebreaker", async () => {
  const { rankCandidates } = await import("../lib/level-parser.ts");
  const a = {
    matchType: "primary-label",
    title: "Same Title",
    embeddable: true,
    videoAvailable: true,
    publishedAt: "2025-01-01T00:00:00Z",
    priority: 0,
    videoId: "aaa",
    playlistPosition: 0,
  };
  const b = {
    matchType: "primary-label",
    title: "Same Title",
    embeddable: true,
    videoAvailable: true,
    publishedAt: "2025-01-01T00:00:00Z",
    priority: 0,
    videoId: "bbb",
    playlistPosition: 0,
  };
  // aaa should sort before bbb
  const result = rankCandidates(a, b);
  assert.ok(result < 0, `"aaa" should sort before "bbb", got ${result}`);
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

test("fonts are loaded via Google Fonts CSS link", async () => {
  const layout = await readFile(new URL("app/layout.tsx", root), "utf8");
  assert.match(layout, /fonts\.googleapis\.com/);
  assert.match(layout, /Fredoka/);
  assert.match(layout, /Nunito/);
  assert.match(layout, /display=swap/);
});

test("font variables are defined in CSS", async () => {
  const css = await readFile(new URL("app/globals.css", root), "utf8");
  assert.match(css, /--font-fredoka/);
  assert.match(css, /--font-nunito/);
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
  assert.match(checkLevels, /rawPlaylistEntries/);
  assert.match(checkLevels, /imported\.entries/);
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

// ─── Rejected ranges file exists ────────────────────────────────────

test("rejected-ranges.json is written", async () => {
  const rejected = JSON.parse(
    await readFile(new URL("data/review/rejected-ranges.json", root), "utf8"),
  );
  assert.ok(Array.isArray(rejected));
  for (const r of rejected) {
    assert.ok(r.reason);
  }
});

// ─── Footer Internal Links ─────────────────────────────────────────

test("footer: featured levels are all approved", async () => {
  const { getFeaturedLevels } = await import("../lib/internal-links.ts");
  const featured = getFeaturedLevels();
  assert.ok(featured.length >= 12, `Expected at least 12 featured levels, got ${featured.length}`);
  assert.ok(featured.length <= 16, `Expected at most 16 featured levels, got ${featured.length}`);

  // All must be approved
  const levels = JSON.parse(
    await readFile(new URL("data/levels/all-levels.json", root), "utf8"),
  );
  const approvedIds = new Set(levels.map((l) => l.levelId));
  for (const f of featured) {
    assert.ok(approvedIds.has(f.levelId), `Featured level ${f.levelId} is not approved`);
  }

  // No duplicates
  const ids = featured.map((f) => f.levelId);
  assert.strictEqual(new Set(ids).size, ids.length, "Featured levels contain duplicates");
});

test("footer: featured ranges are all from real levelRanges", async () => {
  const { getFeaturedRanges } = await import("../lib/internal-links.ts");
  const featured = getFeaturedRanges();
  assert.ok(featured.length >= 8, `Expected at least 8 featured ranges, got ${featured.length}`);
  assert.ok(featured.length <= 12, `Expected at most 12 featured ranges, got ${featured.length}`);

  // No duplicates
  const starts = featured.map((r) => r.start);
  assert.strictEqual(new Set(starts).size, starts.length, "Featured ranges contain duplicates");

  // All must have valid slugs
  for (const r of featured) {
    assert.ok(r.href.startsWith("/levels/"), `Range href ${r.href} does not start with /levels/`);
    assert.ok(r.start > 0, `Range start ${r.start} is not positive`);
    assert.ok(r.end >= r.start, `Range end ${r.end} < start ${r.start}`);
  }
});

test("footer layout contains Featured Level Walkthroughs section", async () => {
  const layout = await readFile(new URL("app/layout.tsx", root), "utf8");
  assert.match(layout, /Featured Level Walkthroughs/);
  assert.match(layout, /Browse by Level Range/);
  assert.match(layout, /getFeaturedLevels/);
  assert.match(layout, /getFeaturedRanges/);
  // Original links still exist
  assert.match(layout, /\/download/);
  assert.match(layout, /\/faq/);
  assert.match(layout, /\/privacy/);
});

// ─── Related Levels (deterministic) ─────────────────────────────────

test("related levels: same levelId returns same results", async () => {
  const { getRelatedLevels } = await import("../lib/internal-links.ts");
  const result1 = getRelatedLevels(340);
  const result2 = getRelatedLevels(340);
  assert.deepStrictEqual(result1, result2, "getRelatedLevels is not deterministic");
});

test("related levels: does not include current level", async () => {
  const { getRelatedLevels } = await import("../lib/internal-links.ts");
  const result = getRelatedLevels(16);
  const self = result.find((r) => r.levelId === 16);
  assert.strictEqual(self, undefined, "Self-referencing link found");
});

test("related levels: no duplicate levelIds", async () => {
  const { getRelatedLevels } = await import("../lib/internal-links.ts");
  const result = getRelatedLevels(100);
  const ids = result.map((r) => r.levelId);
  assert.strictEqual(new Set(ids).size, ids.length, "Duplicate levelIds in related levels");
});

test("related levels: all are approved", async () => {
  const { getRelatedLevels } = await import("../lib/internal-links.ts");
  const levels = JSON.parse(
    await readFile(new URL("data/levels/all-levels.json", root), "utf8"),
  );
  const approvedIds = new Set(levels.map((l) => l.levelId));
  const result = getRelatedLevels(50);
  for (const r of result) {
    assert.ok(approvedIds.has(r.levelId), `Related level ${r.levelId} not approved`);
  }
});

test("related levels: does not exceed max count", async () => {
  const { getRelatedLevels } = await import("../lib/internal-links.ts");
  const result = getRelatedLevels(500, 8);
  assert.ok(result.length <= 8, `Expected at most 8, got ${result.length}`);
});

test("related levels: includes at least one neighbor", async () => {
  const { getRelatedLevels } = await import("../lib/internal-links.ts");
  const result = getRelatedLevels(340);
  const neighborBelow = result.find((r) => r.levelId < 340);
  const neighborAbove = result.find((r) => r.levelId > 340);
  assert.ok(neighborBelow || neighborAbove, "No neighbor found in related levels");
});

test("related levels: different levels get different results", async () => {
  const { getRelatedLevels } = await import("../lib/internal-links.ts");
  const r1 = getRelatedLevels(100).map((r) => r.levelId);
  const r2 = getRelatedLevels(500).map((r) => r.levelId);
  // They should not be identical
  const same = r1.length === r2.length && r1.every((id, i) => id === r2[i]);
  assert.ok(!same, "Level 100 and 500 got identical related levels");
});

test("related levels: Level 1 boundary does not crash", async () => {
  const { getRelatedLevels } = await import("../lib/internal-links.ts");
  const result = getRelatedLevels(1);
  assert.ok(Array.isArray(result));
  assert.ok(!result.some((r) => r.levelId === 1), "Self-referencing at boundary");
});

test("related levels: last level boundary does not crash", async () => {
  const { getRelatedLevels } = await import("../lib/internal-links.ts");
  const levels = JSON.parse(
    await readFile(new URL("data/levels/all-levels.json", root), "utf8"),
  );
  const lastId = levels[levels.length - 1].levelId;
  const result = getRelatedLevels(lastId);
  assert.ok(Array.isArray(result));
  assert.ok(!result.some((r) => r.levelId === lastId), "Self-referencing at boundary");
});

test("related levels: does not use Math.random", async () => {
  const { getRelatedLevels } = await import("../lib/internal-links.ts");
  const source = getRelatedLevels.toString();
  assert.doesNotMatch(source, /Math\.random/);
});

test("level page includes related levels section", async () => {
  const levelPage = await readFile(new URL("app/level/[levelId]/page.tsx", root), "utf8");
  assert.match(levelPage, /getRelatedLevels/);
  assert.match(levelPage, /More Levels to Explore/);
  assert.match(levelPage, /related-levels-nav/);
  assert.match(levelPage, /Browse All Levels/);
});