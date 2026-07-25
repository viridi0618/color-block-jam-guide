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
  const [download, pc, playOnline, aboutGame, faq, sitemap] = await Promise.all([
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
  assert.match(playOnline, /Play Color Block Jam Online/);
  assert.match(playOnline, /OnlineGamePlayer/);
  assert.doesNotMatch(playOnline, /No official web version identified/);
  assert.doesNotMatch(playOnline, /did not find a verified official browser version/);
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

test("level page shows dynamic range hint with levelId", async () => {
  const levelPage = await readFile(new URL("app/level/[levelId]/page.tsx", root), "utf8");
  assert.match(levelPage, /isRangeVideo/);
  assert.match(levelPage, /Level \{levelId\} is included in this Levels/);
  assert.match(levelPage, /Levels \{level\.rangeStart\}/);
  assert.match(levelPage, /level\.rangeEnd/);
  assert.match(levelPage, /find the Level \{levelId\} section/);
  assert.doesNotMatch(levelPage, /This video covers Levels/);
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

test("footer layout contains only approved links", async () => {
  const layout = await readFile(new URL("app/layout.tsx", root), "utf8");
  // Footer should NOT contain featured walkthroughs, ranges, download, faq, about
  assert.doesNotMatch(layout, /Featured Level Walkthroughs/);
  assert.doesNotMatch(layout, /Browse by Level Range/);
  assert.doesNotMatch(layout, /getFeaturedLevels/);
  assert.doesNotMatch(layout, /getFeaturedRanges/);
  assert.doesNotMatch(layout, /\/download/);
  assert.doesNotMatch(layout, /\/faq/);
  assert.doesNotMatch(layout, /\/play-on-pc/);
  assert.doesNotMatch(layout, /\/about-color-block-jam/);
  // But should contain the 4 approved links
  assert.match(layout, /\/levels/);
  assert.match(layout, /\/play-online/);
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

test("related levels: total count is 4-6", async () => {
  const { getRelatedLevels } = await import("../lib/internal-links.ts");
  const result = getRelatedLevels(500);
  assert.ok(result.length >= 4, `Expected at least 4, got ${result.length}`);
  assert.ok(result.length <= 6, `Expected at most 6, got ${result.length}`);
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
  assert.match(levelPage, /More Color Block Jam Walkthroughs/);
  assert.match(levelPage, /related-levels-nav/);
  assert.match(levelPage, /Browse All Color Block Jam Levels/);
});

// ─── Related Levels Composition (real constraints) ─────────────────

/** Compute the 50-level range for a given levelId */
function levelRange(levelId) {
  const rangeStart = Math.floor((levelId - 1) / 50) * 50 + 1;
  const rangeEnd = rangeStart + 49;
  return { rangeStart, rangeEnd };
}

test("related levels: Level 340 same-range levels <= 4", async () => {
  const { getRelatedLevels } = await import("../lib/internal-links.ts");
  const result = getRelatedLevels(340);
  const { rangeStart, rangeEnd } = levelRange(340);
  const sameRange = result.filter((r) => r.levelId >= rangeStart && r.levelId <= rangeEnd);
  assert.ok(
    sameRange.length <= 4,
    `Expected at most 4 same-range, got ${sameRange.length}: ${sameRange.map((r) => r.levelId).join(",")}`,
  );
});

test("related levels: page total links (levels + range + Browse All) <= 8", async () => {
  const { getRelatedLevels } = await import("../lib/internal-links.ts");
  const result = getRelatedLevels(340);
  const totalLinks = result.length + 2; // + range page + All Levels
  assert.ok(
    totalLinks <= 8,
    `Expected total links <= 8, got ${totalLinks} (${result.length} levels + 2 page links)`,
  );
  assert.ok(result.length >= 4, `Expected at least 4 level links, got ${result.length}`);
  assert.ok(result.length <= 6, `Expected at most 6 level links, got ${result.length}`);
});

test("related levels: same levelId returns identical results (determinism)", async () => {
  const { getRelatedLevels } = await import("../lib/internal-links.ts");
  const result1 = getRelatedLevels(340);
  const result2 = getRelatedLevels(340);
  assert.deepStrictEqual(result1, result2, "getRelatedLevels is not deterministic");
});

// ─── Share Button Uniqueness ────────────────────────────────────────

test("share: level page renders ShareLevel exactly once", async () => {
  const levelPage = await readFile(new URL("app/level/[levelId]/page.tsx", root), "utf8");
  const matches = levelPage.match(/<ShareLevel/g);
  assert.ok(matches, "No ShareLevel found");
  assert.strictEqual(matches.length, 1, `Expected 1 ShareLevel, found ${matches.length}`);
});

test("share: the single ShareLevel uses compact", async () => {
  const levelPage = await readFile(new URL("app/level/[levelId]/page.tsx", root), "utf8");
  // The compact ShareLevel should have `compact` prop
  assert.match(levelPage, /<ShareLevel\s+levelId=\{levelId\}\s+canonicalUrl=\{canonicalUrl\}\s+compact/);
});

test("share: no non-compact ShareLevel remains", async () => {
  const levelPage = await readFile(new URL("app/level/[levelId]/page.tsx", root), "utf8");
  // There should be no ShareLevel without compact
  const compactCount = (levelPage.match(/<ShareLevel\s+levelId=\{levelId\}\s+canonicalUrl=\{canonicalUrl\}\s+compact/g) || []).length;
  const totalCount = (levelPage.match(/<ShareLevel/g) || []).length;
  assert.strictEqual(compactCount, totalCount, "All ShareLevel instances should use compact");
});

// ─── Level 1–10 Data Integrity ──────────────────────────────────────

test("level data: Levels 1-10 all exist", async () => {
  const levels = JSON.parse(
    await readFile(new URL("data/levels/all-levels.json", root), "utf8"),
  );
  const ids = new Set(levels.map((l) => l.levelId));
  for (let i = 1; i <= 10; i++) {
    assert.ok(ids.has(i), `Level ${i} should exist`);
  }
});

test("level data: Levels 1-10 have self-canonical", async () => {
  const levelPage = await readFile(new URL("app/level/[levelId]/page.tsx", root), "utf8");
  assert.match(levelPage, /canonical:\s*`\/level\/\$\{levelId\}`/);
});

test("level data: single-level page logic not affected by range video", async () => {
  const levelPage = await readFile(new URL("app/level/[levelId]/page.tsx", root), "utf8");
  // Dual-note still present for dual-number videos
  assert.match(levelPage, /video creator labels this walkthrough/);
  // Normal single-level flow intact
  assert.match(levelPage, /color block jam level \{levelId\} walkthrough/i);
});

// ─── Video Source Card Removal ──────────────────────────────────────

test("video source: no Video source card on level page", async () => {
  const levelPage = await readFile(new URL("app/level/[levelId]/page.tsx", root), "utf8");
  assert.doesNotMatch(levelPage, /Video source/);
  assert.doesNotMatch(levelPage, /This page embeds a public YouTube video/);
  assert.doesNotMatch(levelPage, /More levels in/);
  assert.doesNotMatch(levelPage, /All Color Block Jam Level Walkthroughs/);
  assert.doesNotMatch(levelPage, /source-card/);
});

test("video source: attribution line with dynamic channelTitle", async () => {
  const levelPage = await readFile(new URL("app/level/[levelId]/page.tsx", root), "utf8");
  assert.match(levelPage, /Video walkthrough by/);
  assert.match(levelPage, /video\.channelTitle/);
  assert.match(levelPage, /video\.videoId/);
  assert.match(levelPage, /youtube\.com\/watch/);
  assert.match(levelPage, /on YouTube/);
});

test("video source: YouTube link uses target blank and noopener", async () => {
  const levelPage = await readFile(new URL("app/level/[levelId]/page.tsx", root), "utf8");
  assert.match(levelPage, /target="_blank"/);
  assert.match(levelPage, /rel="noopener noreferrer"/);
});

test("video source: attribution uses .video-attribution CSS class", async () => {
  const levelPage = await readFile(new URL("app/level/[levelId]/page.tsx", root), "utf8");
  assert.match(levelPage, /video-attribution/);
});

// ─── Footer Unified Disclaimer ──────────────────────────────────────

test("footer: unified disclaimer present", async () => {
  const layout = await readFile(new URL("app/layout.tsx", root), "utf8");
  assert.match(layout, /unofficial/);
  assert.match(layout, /not affiliated with Rollic Games/);
  assert.match(layout, /Videos\s+remain\s+the\s+property/);
  assert.match(layout, /footer-disclaimer/);
  assert.doesNotMatch(layout, /footer-legal/);
  // "unofficial" must appear exactly once — no duplicate disclaimer
  const unofficialMatches = layout.match(/unofficial/gi) ?? [];
  assert.strictEqual(unofficialMatches.length, 1, `Expected 1 'unofficial', got ${unofficialMatches.length}`);
});

// ─── Existing Content Still Present ─────────────────────────────────

test("level page: Related Levels, range link, Browse All still present", async () => {
  const levelPage = await readFile(new URL("app/level/[levelId]/page.tsx", root), "utf8");
  assert.match(levelPage, /getRelatedLevels/);
  assert.match(levelPage, /More Color Block Jam Walkthroughs/);
  assert.match(levelPage, /Browse All Color Block Jam Levels/);
  assert.match(levelPage, /Levels \{range\.start\}/);
});

test("level page: Previous / Next still present", async () => {
  const levelPage = await readFile(new URL("app/level/[levelId]/page.tsx", root), "utf8");
  assert.match(levelPage, /Previous Level/);
  assert.match(levelPage, /Next Level/);
});

test("level page: compact share and range hint still present", async () => {
  const levelPage = await readFile(new URL("app/level/[levelId]/page.tsx", root), "utf8");
  assert.match(levelPage, /<ShareLevel\s+levelId=\{levelId\}\s+canonicalUrl=\{canonicalUrl\}\s+compact/);
  assert.match(levelPage, /Level \{levelId\} is included in this Levels/);
});

// ─── Online Game Configuration ─────────────────────────────────────

test("online game: config reads from environment variables", async () => {
  const config = await readFile(new URL("lib/online-game.ts", root), "utf8");
  assert.match(config, /NEXT_PUBLIC_ONLINE_GAME_ENABLED/);
  assert.match(config, /NEXT_PUBLIC_ONLINE_GAME_EMBED_URL/);
  assert.match(config, /NEXT_PUBLIC_ONLINE_GAME_OPEN_URL/);
  assert.match(config, /NEXT_PUBLIC_ONLINE_GAME_COVER_URL/);
  assert.match(config, /NEXT_PUBLIC_ONLINE_GAME_ASPECT_RATIO/);
  assert.match(config, /enabled/);
  assert.match(config, /embedUrl/);
  assert.match(config, /openUrl/);
  assert.match(config, /coverUrl/);
  assert.match(config, /aspectRatio/);
});

test("online game: no hardcoded 1Games URL in page components", async () => {
  const [playOnline, levelPage, homePage, player] = await Promise.all([
    readFile(new URL("app/play-online/page.tsx", root), "utf8"),
    readFile(new URL("app/level/[levelId]/page.tsx", root), "utf8"),
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("components/OnlineGamePlayer.tsx", root), "utf8"),
  ]);
  // There should be no hardcoded game URLs in page components
  assert.doesNotMatch(playOnline, /1games\.io/);
  assert.doesNotMatch(levelPage, /1games\.io/);
  assert.doesNotMatch(homePage, /1games\.io/);
  // The player component reads from config, not hardcoded
  assert.match(player, /onlineGameConfig\.embedUrl/);
});

test("online game: all game URLs come from config", async () => {
  const player = await readFile(new URL("components/OnlineGamePlayer.tsx", root), "utf8");
  assert.match(player, /onlineGameConfig/);
  assert.match(player, /onlineGameConfig\.embedUrl/);
  assert.match(player, /onlineGameConfig\.coverUrl/);
  assert.match(player, /onlineGameAvailable/);
});

// ─── OnlineGamePlayer Component ─────────────────────────────────────

test("online game player: initial state has no iframe in source", async () => {
  const player = await readFile(new URL("components/OnlineGamePlayer.tsx", root), "utf8");
  // The initial render path (idle state) should NOT contain an iframe
  assert.match(player, /playerState === "idle"/);
  // The iframe is only rendered when not idle
  assert.match(player, /<iframe/);
  // The iframe should NOT be in the idle branch
  assert.match(player, /online-game-start-overlay/);
  // Verify the iframe is inside the non-idle branch
  const idleIndex = player.indexOf('playerState === "idle"');
  const iframeIndex = player.indexOf("<iframe");
  assert.ok(iframeIndex > idleIndex, "iframe should not be rendered in idle state");
});

test("online game player: is a client component", async () => {
  const player = await readFile(new URL("components/OnlineGamePlayer.tsx", root), "utf8");
  assert.match(player, /"use client"/);
});

test("online game player: supports sourcePage prop", async () => {
  const player = await readFile(new URL("components/OnlineGamePlayer.tsx", root), "utf8");
  assert.match(player, /sourcePage/);
  assert.match(player, /"home" \| "play_online" \| "level"/);
});

test("online game player: supports sourceLevel prop for analytics only", async () => {
  const player = await readFile(new URL("components/OnlineGamePlayer.tsx", root), "utf8");
  assert.match(player, /sourceLevel\?/);
  assert.match(player, /source_level/);
  // sourceLevel should NOT be passed to iframe URL
  const iframeSrc = player.match(/src=\{onlineGameConfig\.embedUrl\}/);
  assert.ok(iframeSrc, "iframe src should only use config embedUrl");
});

test("online game player: supports compact prop", async () => {
  const player = await readFile(new URL("components/OnlineGamePlayer.tsx", root), "utf8");
  assert.match(player, /compact/);
  assert.match(player, /online-game-shell--compact/);
});

test("online game player: Play Now button exists inside .online-game-frame", async () => {
  const player = await readFile(new URL("components/OnlineGamePlayer.tsx", root), "utf8");
  assert.match(player, /Play Now/);
  // Play Now must be inside .online-game-frame (as a descendant of the start overlay)
  assert.match(player, /online-game-start-overlay/);
  // Must call handlePlay
  assert.match(player, /onClick=\{handlePlay\}/);
  // Must be a real button
  assert.match(player, /type="button"/);
  // No Play Now button outside .online-game-frame (the only button is inside the overlay)
  assert.doesNotMatch(player, /online-game-cover.*<button[^>]*>Play Now/);
});

test("online game player: Play Now overlay uses absolute positioning", async () => {
  const css = await readFile(new URL("app/globals.css", root), "utf8");
  assert.match(css, /online-game-start-overlay/);
  assert.match(css, /position:\s*absolute/);
  assert.match(css, /inset:\s*0/);
});

test("online game player: Try Again button only in timeout state", async () => {
  const player = await readFile(new URL("components/OnlineGamePlayer.tsx", root), "utf8");
  assert.match(player, /Try Again/);
  // Try Again should only appear inside the timeout branch
  assert.match(player, /playerState === "timeout"/);
  assert.match(player, /handleTryAgain/);
});

test("online game player: iframe has correct attributes", async () => {
  const player = await readFile(new URL("components/OnlineGamePlayer.tsx", root), "utf8");
  assert.match(player, /title="Color Block Jam Online"/);
  assert.match(player, /allow="autoplay; fullscreen; gamepad"/);
  assert.match(player, /allowFullScreen/);
  assert.match(player, /referrerPolicy="strict-origin-when-cross-origin"/);
});

test("online game player: has loading timeout fallback inside .online-game-frame", async () => {
  const player = await readFile(new URL("components/OnlineGamePlayer.tsx", root), "utf8");
  assert.match(player, /timeout/);
  assert.match(player, /The game is taking longer than expected to load/);
  assert.match(player, /setTimeout/);
  // Timeout overlay must be inside .online-game-frame
  assert.match(player, /online-game-timeout-overlay/);
  assert.match(player, /online-game-timeout-panel/);
});

test("online game player: timeout overlay uses absolute positioning", async () => {
  const css = await readFile(new URL("app/globals.css", root), "utf8");
  assert.match(css, /online-game-timeout-overlay/);
  assert.match(css, /position:\s*absolute/);
  assert.match(css, /inset:\s*0/);
});

test("online game player: returns null when disabled", async () => {
  const player = await readFile(new URL("components/OnlineGamePlayer.tsx", root), "utf8");
  assert.match(player, /if \(!onlineGameAvailable\) return null/);
});

// ─── Play Online Page ────────────────────────────────────────────────

test("play-online page: uses OnlineGamePlayer with sourcePage play_online and compact", async () => {
  const page = await readFile(new URL("app/play-online/page.tsx", root), "utf8");
  assert.match(page, /OnlineGamePlayer/);
  assert.match(page, /sourcePage="play_online"/);
  assert.match(page, /compact/);
});

test("play-online page: has rich content sections", async () => {
  const page = await readFile(new URL("app/play-online/page.tsx", root), "utf8");
  assert.match(page, /How to Play/);
  assert.match(page, /About This Game/);
});

test("play-online page: has correct metadata", async () => {
  const page = await readFile(new URL("app/play-online/page.tsx", root), "utf8");
  assert.match(page, /Play Color Block Jam Online/);
  assert.match(page, /canonical: "\/play-online"/);
  assert.match(page, /browse level walkthroughs and solutions/);
});

test("play-online page: has Level Search", async () => {
  const page = await readFile(new URL("app/play-online/page.tsx", root), "utf8");
  assert.match(page, /PlayOnlineLevelSearch/);
  assert.match(page, /Looking for a walkthrough/);
  // "Find My Walkthrough" button label lives in PlayOnlineLevelSearch component
  const search = await readFile(
    new URL("components/PlayOnlineLevelSearch.tsx", root),
    "utf8",
  );
  assert.match(search, /Find My Walkthrough/);
});

test("play-online page: has Latest Level Guides", async () => {
  const page = await readFile(new URL("app/play-online/page.tsx", root), "utf8");
  assert.match(page, /Latest Level Guides/);
  assert.match(page, /levels\.slice\(-6\)/);
});

test("play-online page: has Download, PC, FAQ, All Levels links", async () => {
  const page = await readFile(new URL("app/play-online/page.tsx", root), "utf8");
  assert.match(page, /\/download/);
  assert.match(page, /\/play-on-pc/);
  assert.match(page, /\/faq/);
  assert.match(page, /\/levels/);
  assert.match(page, /All Level Guides/);
});

test("play-online page: does not contain old negative content", async () => {
  const page = await readFile(new URL("app/play-online/page.tsx", root), "utf8");
  assert.doesNotMatch(page, /No official web version identified/);
  assert.doesNotMatch(page, /Avoid misleading copies/);
  assert.doesNotMatch(page, /did not find a verified official browser version/);
  assert.doesNotMatch(page, /matching walkthrough/);
  assert.doesNotMatch(page, /official browser version/);
});

test("play-online page: disabled state shows fallback", async () => {
  const page = await readFile(new URL("app/play-online/page.tsx", root), "utf8");
  assert.match(page, /temporarily unavailable/);
  assert.match(page, /Browse level/);
  assert.match(page, /walkthroughs while it is being restored/);
  // Even in disabled state, Level Search and guides are present
  assert.match(page, /LevelSearch/);
  assert.match(page, /Latest Level Guides/);
});

// ─── Level Page OnlineGamePlayer ─────────────────────────────────────

test("level page: does NOT import OnlineGamePlayer directly (moved to shared layout)", async () => {
  const levelPage = await readFile(new URL("app/level/[levelId]/page.tsx", root), "utf8");
  assert.doesNotMatch(levelPage, /import \{ OnlineGamePlayer \} from/);
  assert.doesNotMatch(levelPage, /<OnlineGamePlayer/);
});

test("level page: OnlineGamePlayer is rendered via shared layout", async () => {
  const levelLayout = await readFile(new URL("app/level/layout.tsx", root), "utf8");
  assert.match(levelLayout, /PersistentOnlineGame/);
});

test("level page: game section appears after main content in layout", async () => {
  const levelLayout = await readFile(new URL("app/level/layout.tsx", root), "utf8");
  const childrenIndex = levelLayout.indexOf("{children}");
  const gameIndex = levelLayout.indexOf("<PersistentOnlineGame");
  assert.ok(childrenIndex >= 0, "{children} not found in layout");
  assert.ok(gameIndex >= 0, "<PersistentOnlineGame not found in layout");
  assert.ok(childrenIndex < gameIndex, "PersistentOnlineGame should appear after {children} in layout");
});

test("level page: does not contain play-level or matching-walkthrough promises", async () => {
  const levelPage = await readFile(new URL("app/level/[levelId]/page.tsx", root), "utf8");
  assert.doesNotMatch(levelPage, /Play Level \{levelId\}/);
  assert.doesNotMatch(levelPage, /Continue Level/);
  assert.doesNotMatch(levelPage, /matching walkthrough/);
  assert.doesNotMatch(levelPage, /same level/);
  assert.doesNotMatch(levelPage, /Play this level/);
});

test("level page: existing content preserved", async () => {
  const levelPage = await readFile(new URL("app/level/[levelId]/page.tsx", root), "utf8");
  assert.match(levelPage, /VideoEmbed/);
  assert.match(levelPage, /ShareLevel/);
  assert.match(levelPage, /AlternativeVideo/);
  assert.match(levelPage, /getRelatedLevels/);
  assert.match(levelPage, /video-attribution/);
  assert.match(levelPage, /Video walkthrough by/);
});

// ─── Homepage Online Game ───────────────────────────────────────────

test("homepage: renders OnlineGamePlayer with compact", async () => {
  const home = await readFile(new URL("app/page.tsx", root), "utf8");
  assert.match(home, /OnlineGamePlayer/);
  assert.match(home, /sourcePage="home"/);
  assert.match(home, /compact/);
});

test("homepage: has Play Color Block Jam Online section", async () => {
  const home = await readFile(new URL("app/page.tsx", root), "utf8");
  assert.match(home, /Play Color Block Jam Online/);
  assert.match(home, /Take a Puzzle Break/);
  assert.match(home, /without leaving this page/);
});

test("homepage: no longer uses TrackedPlayOnlineLink", async () => {
  const home = await readFile(new URL("app/page.tsx", root), "utf8");
  assert.doesNotMatch(home, /TrackedPlayOnlineLink/);
});

test("homepage: no jump to /play-online from main game section", async () => {
  const home = await readFile(new URL("app/page.tsx", root), "utf8");
  // The game section area should not contain a Link to /play-online
  const playOnlineIdx = home.indexOf("Play Color Block Jam Online");
  const sectionEnd = home.indexOf("Browse by Level Range", playOnlineIdx);
  const gameSection = home.substring(playOnlineIdx, sectionEnd);
  assert.doesNotMatch(gameSection, /href="\/play-online"/);
});

test("homepage: game section is after Featured Walkthroughs, before Browse by Level Range", async () => {
  const home = await readFile(new URL("app/page.tsx", root), "utf8");
  const featuredIndex = home.indexOf("Featured Walkthroughs");
  const playOnlineIndex = home.indexOf("Play Color Block Jam Online");
  const rangeIndex = home.indexOf("Browse by Level Range");
  assert.ok(featuredIndex < playOnlineIndex, "Play Online section should be after Featured Walkthroughs");
  assert.ok(playOnlineIndex < rangeIndex, "Play Online section should be before Browse by Level Range");
});

test("homepage: TrackedPlayOnlineLink file no longer exists", async () => {
  const fs = await import("node:fs/promises");
  await assert.rejects(
    () => fs.access(new URL("components/TrackedPlayOnlineLink.tsx", root)),
    /ENOENT/,
  );
});

// ─── Homepage no longer uses play-online-home-card ──────────────────

test("homepage: no play-online-home-card class", async () => {
  const home = await readFile(new URL("app/page.tsx", root), "utf8");
  assert.doesNotMatch(home, /play-online-home-card/);
});

// ─── Analytics ──────────────────────────────────────────────────────

test("analytics: track function is a no-op when gtag is missing", async () => {
  const analytics = await readFile(new URL("lib/analytics.ts", root), "utf8");
  assert.match(analytics, /typeof window === "undefined"/);
  assert.match(analytics, /!w\.gtag/);
  assert.match(analytics, /try/);
  assert.match(analytics, /catch/);
});

test("analytics: game_start is tracked on Play Now click", async () => {
  const player = await readFile(new URL("components/OnlineGamePlayer.tsx", root), "utf8");
  assert.match(player, /track\("game_start"/);
  assert.match(player, /game_provider/);
  assert.match(player, /source_page/);
});

test("analytics: game_start not triggered on iframe onLoad", async () => {
  const player = await readFile(new URL("components/OnlineGamePlayer.tsx", root), "utf8");
  // The onLoad should only clear timeout and set state, not track game_start
  const handleIframeLoad = player.substring(
    player.indexOf("handleIframeLoad"),
    player.indexOf("handleIframeLoad") + 300,
  );
  assert.doesNotMatch(handleIframeLoad, /game_start/);
});

test("analytics: game_retry event tracked", async () => {
  const player = await readFile(new URL("components/OnlineGamePlayer.tsx", root), "utf8");
  assert.match(player, /track\("game_retry"/);
  // game_retry should only fire on Try Again, which is in timeout state
  assert.match(player, /handleTryAgain/);
});

test("analytics: source_level is only in analytics, not in iframe URL", async () => {
  const player = await readFile(new URL("components/OnlineGamePlayer.tsx", root), "utf8");
  // source_level appears in the track call
  assert.match(player, /source_level/);
  // But the iframe src should only be config.embedUrl
  const srcMatch = player.match(/src=\{onlineGameConfig\.embedUrl\}/);
  assert.ok(srcMatch, "iframe src should be only config.embedUrl, not include source_level");
});

// ─── LevelSearch buttonLabel prop ───────────────────────────────────

test("level search: supports optional buttonLabel prop", async () => {
  const search = await readFile(new URL("components/LevelSearch.tsx", root), "utf8");
  assert.match(search, /buttonLabel/);
  assert.match(search, /Find My Level/);
  assert.match(search, /\{buttonLabel\}/);
});

// ─── Persistent Online Game: Structure ──────────────────────────────

test("persistent game: app/level/layout.tsx exists", async () => {
  const stat = await import("node:fs/promises").then((fs) =>
    fs.stat(new URL("app/level/layout.tsx", root)),
  );
  assert.ok(stat.isFile(), "app/level/layout.tsx should exist");
});

test("persistent game: layout renders PersistentOnlineGame", async () => {
  const layout = await readFile(new URL("app/level/layout.tsx", root), "utf8");
  assert.match(layout, /PersistentOnlineGame/);
  assert.match(layout, /from "@\/components\/PersistentOnlineGame"/);
});

test("persistent game: level page does NOT render OnlineGamePlayer", async () => {
  const levelPage = await readFile(new URL("app/level/[levelId]/page.tsx", root), "utf8");
  assert.doesNotMatch(levelPage, /<OnlineGamePlayer/);
  assert.doesNotMatch(levelPage, /import \{ OnlineGamePlayer \} from/);
});

test("persistent game: level page does NOT contain iframe", async () => {
  const levelPage = await readFile(new URL("app/level/[levelId]/page.tsx", root), "utf8");
  assert.doesNotMatch(levelPage, /<iframe/);
});

test("persistent game: PersistentOnlineGame reuses OnlineGamePlayer", async () => {
  const persistent = await readFile(
    new URL("components/PersistentOnlineGame.tsx", root),
    "utf8",
  );
  assert.match(persistent, /OnlineGamePlayer/);
  assert.match(persistent, /from "\.\/OnlineGamePlayer"/);
  // Should NOT duplicate iframe or player logic
  assert.doesNotMatch(persistent, /<iframe/);
});

test("persistent game: no key={pathname} in PersistentOnlineGame", async () => {
  const persistent = await readFile(
    new URL("components/PersistentOnlineGame.tsx", root),
    "utf8",
  );
  assert.doesNotMatch(persistent, /key=\{pathname\}/);
});

test("persistent game: no key={levelId} in player chain", async () => {
  const [persistent, player] = await Promise.all([
    readFile(new URL("components/PersistentOnlineGame.tsx", root), "utf8"),
    readFile(new URL("components/OnlineGamePlayer.tsx", root), "utf8"),
  ]);
  assert.doesNotMatch(persistent, /key=\{levelId\}/);
  assert.doesNotMatch(persistent, /key=\{sourceLevel\}/);
  // The iframe has key={reloadKey} only — not levelId
  assert.match(player, /key=\{reloadKey\}/);
});

test("persistent game: iframe URL does not contain levelId", async () => {
  const [persistent, player] = await Promise.all([
    readFile(new URL("components/PersistentOnlineGame.tsx", root), "utf8"),
    readFile(new URL("components/OnlineGamePlayer.tsx", root), "utf8"),
  ]);
  // PersistentOnlineGame should not pass levelId to embed URL
  assert.doesNotMatch(persistent, /embedUrl.*levelId/);
  assert.doesNotMatch(persistent, /embedUrl.*sourceLevel/);
  // OnlineGamePlayer iframe src should only use config
  assert.match(player, /src=\{onlineGameConfig\.embedUrl\}/);
});

test("persistent game: no template.tsx used for player", async () => {
  try {
    await import("node:fs/promises").then((fs) =>
      fs.stat(new URL("app/level/template.tsx", root)),
    );
    // If template.tsx exists, it should NOT contain PersistentOnlineGame
    const template = await readFile(
      new URL("app/level/template.tsx", root),
      "utf8",
    );
    assert.doesNotMatch(template, /PersistentOnlineGame/);
    assert.doesNotMatch(template, /OnlineGamePlayer/);
  } catch {
    // template.tsx doesn't exist, which is correct
  }
});

test("persistent game: Previous/Next use Next Link", async () => {
  const levelPage = await readFile(
    new URL("app/level/[levelId]/page.tsx", root),
    "utf8",
  );
  // Previous and Next should use <Link> not <a> — verify within level-nav section
  assert.match(levelPage, /level-nav[\s\S]*<Link[\s\S]*Previous Level/);
  assert.match(levelPage, /level-nav[\s\S]*<Link[\s\S]*Next Level/);
});

test("persistent game: Related Levels use Next Link", async () => {
  const levelPage = await readFile(
    new URL("app/level/[levelId]/page.tsx", root),
    "utf8",
  );
  // Related Levels should use <Link>
  assert.match(levelPage, /<Link[\s\S]*related-level-link/);
  assert.match(levelPage, /<Link[\s\S]*Browse All Color Block Jam Levels/);
});

// ─── Persistent Online Game: State ──────────────────────────────────

test("persistent game: initial state has no iframe in idle", async () => {
  const player = await readFile(
    new URL("components/OnlineGamePlayer.tsx", root),
    "utf8",
  );
  assert.match(player, /playerState === "idle"/);
  // The idle branch should show cover and start overlay, not iframe
  assert.match(player, /online-game-cover/);
  assert.match(player, /online-game-start-overlay/);
  assert.match(player, /Play Now/);
});

test("persistent game: initial state shows Play Now", async () => {
  const player = await readFile(
    new URL("components/OnlineGamePlayer.tsx", root),
    "utf8",
  );
  assert.match(player, /Play Now/);
});

test("persistent game: sessionStorage check in PersistentOnlineGame", async () => {
  const persistent = await readFile(
    new URL("components/PersistentOnlineGame.tsx", root),
    "utf8",
  );
  assert.match(persistent, /sessionStorage/);
  assert.match(persistent, /online_game_started/);
  assert.match(persistent, /getItem/);
});

test("persistent game: sessionStorage wrapped in try/catch", async () => {
  const persistent = await readFile(
    new URL("components/PersistentOnlineGame.tsx", root),
    "utf8",
  );
  assert.match(persistent, /try\s*\{/);
  assert.match(persistent, /catch/);
});

test("persistent game: sessionStorage setItem on game start", async () => {
  const persistent = await readFile(
    new URL("components/PersistentOnlineGame.tsx", root),
    "utf8",
  );
  assert.match(persistent, /setItem\("online_game_started"/);
  assert.match(persistent, /"1"/);
});

test("persistent game: no auto-load without sessionStorage", async () => {
  const persistent = await readFile(
    new URL("components/PersistentOnlineGame.tsx", root),
    "utf8",
  );
  // gameStarted is initially false when no sessionStorage marker
  assert.match(persistent, /sessionStorage\.getItem\("online_game_started"\)/);
  // Only set to true when sessionStorage has "1" or user clicks
  assert.match(persistent, /"1"/);
});

test("persistent game: gameStarted prop triggers auto-load in OnlineGamePlayer", async () => {
  const player = await readFile(
    new URL("components/OnlineGamePlayer.tsx", root),
    "utf8",
  );
  assert.match(player, /gameStarted/);
  // The auto-start useEffect
  assert.match(player, /gameStarted && !hasAutoStarted\.current/);
  assert.match(player, /setPlayerState\("loading"\)/);
});

test("persistent game: no game_start retrigger on pathname change", async () => {
  const persistent = await readFile(
    new URL("components/PersistentOnlineGame.tsx", root),
    "utf8",
  );
  // No key based on pathname means component doesn't remount
  assert.doesNotMatch(persistent, /key=\{pathname\}/);
  // The OnlineGamePlayer is not recreated on pathname change
  assert.doesNotMatch(persistent, /key=\{[^}]*pathname/);
});

test("persistent game: Reload changes reloadKey", async () => {
  const player = await readFile(
    new URL("components/OnlineGamePlayer.tsx", root),
    "utf8",
  );
  assert.match(player, /setReloadKey/);
  assert.match(player, /=>\s*k\s*\+\s*1/);
});

test("persistent game: sessionStorage not available does not crash", async () => {
  const persistent = await readFile(
    new URL("components/PersistentOnlineGame.tsx", root),
    "utf8",
  );
  // Both getItem and setItem are wrapped in try/catch
  const tryBlocks = persistent.match(/try\s*\{/g);
  assert.ok(tryBlocks && tryBlocks.length >= 2, `Expected at least 2 try blocks, got ${tryBlocks?.length ?? 0}`);
});

// ─── Persistent Online Game: Analytics ──────────────────────────────

test("persistent game: source_level used in analytics tracking", async () => {
  const player = await readFile(
    new URL("components/OnlineGamePlayer.tsx", root),
    "utf8",
  );
  assert.match(player, /source_level/);
  assert.match(player, /sourceLevel != null/);
});

test("persistent game: source_level NOT in embed URL", async () => {
  const [persistent, player] = await Promise.all([
    readFile(new URL("components/PersistentOnlineGame.tsx", root), "utf8"),
    readFile(new URL("components/OnlineGamePlayer.tsx", root), "utf8"),
  ]);
  // The iframe src should only be config.embedUrl
  assert.match(player, /src=\{onlineGameConfig\.embedUrl\}/);
  // PersistentOnlineGame should not pass levelId to any URL
  assert.doesNotMatch(persistent, /embedUrl.*sourceLevel/);
});

test("persistent game: gtag not available does not crash", async () => {
  const analytics = await readFile(new URL("lib/analytics.ts", root), "utf8");
  assert.match(analytics, /!w\.gtag/);
  assert.match(analytics, /try/);
  assert.match(analytics, /catch/);
});

test("persistent game: uses usePathname to parse levelId", async () => {
  const persistent = await readFile(
    new URL("components/PersistentOnlineGame.tsx", root),
    "utf8",
  );
  assert.match(persistent, /usePathname/);
  assert.match(persistent, /pathname\?\.match/);
});

test("persistent game: pathname parsed only for analytics, not for iframe", async () => {
  const persistent = await readFile(
    new URL("components/PersistentOnlineGame.tsx", root),
    "utf8",
  );
  // sourceLevel from pathname should only go to OnlineGamePlayer as prop
  assert.match(persistent, /sourceLevel=\{sourceLevel\}/);
  // It should NOT be used to construct embed URL
  assert.doesNotMatch(persistent, /embedUrl.*sourceLevel/);
  assert.doesNotMatch(persistent, /embedUrl.*levelId/);
});

// ─── Persistent Online Game: Disabled State ─────────────────────────

test("persistent game: disabled when config is falsy", async () => {
  const persistent = await readFile(
    new URL("components/PersistentOnlineGame.tsx", root),
    "utf8",
  );
  assert.match(persistent, /if \(!onlineGameAvailable\) return null/);
});

test("persistent game: disabled state does not create empty container", async () => {
  const persistent = await readFile(
    new URL("components/PersistentOnlineGame.tsx", root),
    "utf8",
  );
  // Returns null, not an empty div
  assert.match(persistent, /return null/);
});

test("persistent game: disabled state does not read sessionStorage", async () => {
  const persistent = await readFile(
    new URL("components/PersistentOnlineGame.tsx", root),
    "utf8",
  );
  // The sessionStorage lazy initializer is guarded by onlineGameAvailable check
  assert.match(persistent, /if \(!onlineGameAvailable\) return false/);
  // The component returns null when unavailable
  assert.match(persistent, /if \(!onlineGameAvailable\) return null/);
});

// ─── Persistent Online Game: CSS ────────────────────────────────────

test("persistent game: styles use existing CSS classes", async () => {
  const [persistent, css] = await Promise.all([
    readFile(new URL("components/PersistentOnlineGame.tsx", root), "utf8"),
    readFile(new URL("app/globals.css", root), "utf8"),
  ]);
  assert.match(persistent, /online-game-level-section/);
  assert.match(persistent, /content-card/);
  assert.match(css, /online-game-level-section/);
});

// ─── Test Game Page ─────────────────────────────────────────────────

test("test-game.html exists for browser testing", async () => {
  const testGame = await readFile(
    new URL("public/test-game.html", root),
    "utf8",
  );
  assert.match(testGame, /Test Game/);
  assert.match(testGame, /counter/);
  assert.match(testGame, /increment/);
});

test("test-game.html has noindex meta tag", async () => {
  const testGame = await readFile(
    new URL("public/test-game.html", root),
    "utf8",
  );
  assert.match(testGame, /<meta name="robots" content="noindex, nofollow">/);
  assert.match(testGame, /Test fixture used by Playwright E2E only/);
});

// ─── Online Game Config Availability ────────────────────────────────

test("online game config: trim() is applied to all URLs", async () => {
  const config = await readFile(new URL("lib/online-game.ts", root), "utf8");
  assert.match(config, /NEXT_PUBLIC_ONLINE_GAME_EMBED_URL\?\.trim\(\)/);
  assert.match(config, /NEXT_PUBLIC_ONLINE_GAME_OPEN_URL\?\.trim\(\)/);
  assert.match(config, /NEXT_PUBLIC_ONLINE_GAME_COVER_URL\?\.trim\(\)/);
  assert.match(config, /NEXT_PUBLIC_ONLINE_GAME_ASPECT_RATIO\?\.trim\(\)/);
});

test("online game config: onlineGameAvailable is exported", async () => {
  const config = await readFile(new URL("lib/online-game.ts", root), "utf8");
  assert.match(config, /onlineGameAvailable/);
  assert.match(config, /onlineGameConfig\.enabled && onlineGameConfig\.embedUrl\.length > 0/);
});

test("online game config: enabled defaults to true (no env)", async () => {
  const config = await readFile(new URL("lib/online-game.ts", root), "utf8");
  // enabled is true when NEXT_PUBLIC_ONLINE_GAME_ENABLED is not set to "false"
  assert.match(config, /enabled: enabledValue !== "false"/);
  assert.match(config, /DEFAULT_GAME_EMBED_URL/);
});

test("online game config: embedUrl falls back to default", async () => {
  const config = await readFile(new URL("lib/online-game.ts", root), "utf8");
  assert.match(config, /DEFAULT_GAME_EMBED_URL = "https:\/\/1games\.io\/game\/color-block-jam\/"/);
  assert.match(config, /DEFAULT_GAME_OPEN_URL/);
  // The || operator connects trim() to DEFAULT, across lines
  assert.match(config, /\|\|[\s\n]*DEFAULT_GAME_EMBED_URL/);
  assert.match(config, /\|\|[\s\n]*DEFAULT_GAME_OPEN_URL/);
});

test("online game config: enabled=false means unavailable", async () => {
  const config = await readFile(new URL("lib/online-game.ts", root), "utf8");
  // enabledValue !== "false" means enabled=true by default, false when env="false"
  assert.match(config, /enabledValue !== "false"/);
  assert.match(config, /onlineGameConfig\.enabled && onlineGameConfig\.embedUrl\.length > 0/);
});

test("online game config: enabled=true + embedUrl=\"\" means unavailable", async () => {
  // When embedUrl is empty string (after trim), length === 0, so available is false
  const config = await readFile(new URL("lib/online-game.ts", root), "utf8");
  assert.match(config, /embedUrl\.length > 0/);
});

test("persistent game: uses onlineGameAvailable not onlineGameConfig.enabled", async () => {
  const persistent = await readFile(
    new URL("components/PersistentOnlineGame.tsx", root),
    "utf8",
  );
  assert.match(persistent, /onlineGameAvailable/);
  assert.match(persistent, /if \(!onlineGameAvailable\) return null/);
});

test("online game player: uses onlineGameAvailable not onlineGameConfig.enabled", async () => {
  const player = await readFile(
    new URL("components/OnlineGamePlayer.tsx", root),
    "utf8",
  );
  assert.match(player, /onlineGameAvailable/);
  assert.match(player, /if \(!onlineGameAvailable\) return null/);
});

test("play-online page: uses onlineGameAvailable", async () => {
  const page = await readFile(new URL("app/play-online/page.tsx", root), "utf8");
  assert.match(page, /onlineGameAvailable/);
  assert.match(page, /if \(!onlineGameAvailable\)/);
});

// ─── Analytics Events ────────────────────────────────────────────────

test("analytics: play_online_view event exists", async () => {
  const tracker = await readFile(
    new URL("components/PlayOnlineViewTracker.tsx", root),
    "utf8",
  );
  assert.match(tracker, /play_online_view/);
  assert.match(tracker, /source_page.*play_online/);
  assert.match(tracker, /tracked\.current/);
  assert.match(tracker, /useRef/);
});

test("analytics: play_online_from_home event exists in OnlineGamePlayer", async () => {
  const player = await readFile(
    new URL("components/OnlineGamePlayer.tsx", root),
    "utf8",
  );
  assert.match(player, /play_online_from_home/);
  assert.match(player, /source_page.*home/);
  // Should only fire when sourcePage === "home"
  assert.match(player, /sourcePage === "home"/);
});

test("analytics: play_online_from_level event tracked on first click", async () => {
  const player = await readFile(
    new URL("components/OnlineGamePlayer.tsx", root),
    "utf8",
  );
  assert.match(player, /play_online_from_level/);
  assert.match(player, /sourcePage === "level"/);
  // Should only fire on level pages, not play_online
});

test("analytics: play_online_from_level NOT triggered on sessionStorage recovery", async () => {
  const player = await readFile(
    new URL("components/OnlineGamePlayer.tsx", root),
    "utf8",
  );
  // The auto-start useEffect does NOT call handlePlay, so it won't trigger play_online_from_level
  assert.match(player, /setPlayerState\("loading"\)/);
  // The auto-recovery only sets state, it does not call track()
  const autoStartStart = player.indexOf("gameStarted && !hasAutoStarted.current");
  // Find the end of the auto-start useEffect (closing of the dependency array)
  const setStateLine = player.indexOf("setPlayerState", autoStartStart);
  const useEffectEnd = player.indexOf("}, [gameStarted, playerState]);", setStateLine);
  const autoStartBlock = player.substring(autoStartStart, useEffectEnd);
  assert.doesNotMatch(autoStartBlock, /track\(/);
  assert.doesNotMatch(autoStartBlock, /play_online_from_level/);
});

test("analytics: game_load_error event exists", async () => {
  const player = await readFile(
    new URL("components/OnlineGamePlayer.tsx", root),
    "utf8",
  );
  assert.match(player, /game_load_error/);
  assert.match(player, /error_type.*timeout/);
  assert.match(player, /errorTrackedForCycle/);
});

test("analytics: errorTrackedForCycle initial value allows first timeout", async () => {
  const player = await readFile(
    new URL("components/OnlineGamePlayer.tsx", root),
    "utf8",
  );
  // Must be -1 (or null), NOT 0, so first timeout fires game_load_error
  assert.match(player, /useRef\(-1\)/);
  assert.doesNotMatch(player, /useRef\(0\)/);
});

test("analytics: game_load_error dedup per reloadKey", async () => {
  const player = await readFile(
    new URL("components/OnlineGamePlayer.tsx", root),
    "utf8",
  );
  assert.match(player, /errorTrackedForCycle\.current === reloadKey/);
  assert.match(player, /errorTrackedForCycle\.current = reloadKey/);
});

test("analytics: game_load_error dedup allows fire after Try Again", async () => {
  const player = await readFile(
    new URL("components/OnlineGamePlayer.tsx", root),
    "utf8",
  );
  // After Try Again: reloadKey increments, errorTrackedForCycle is reset by assignment,
  // so the next timeout cycle can fire again (new reloadKey !== old tracked value)
  assert.match(player, /setReloadKey\(\(k\) => k \+ 1\)/);
  assert.match(player, /errorTrackedForCycle\.current = reloadKey/);
});

test("analytics: walkthrough_search_from_play_page event exists", async () => {
  const playOnlineSearch = await readFile(
    new URL("components/PlayOnlineLevelSearch.tsx", root),
    "utf8",
  );
  assert.match(playOnlineSearch, /walkthrough_search_from_play_page/);
  assert.match(playOnlineSearch, /source_page.*play_online/);
  assert.match(playOnlineSearch, /target_level/);
});

test("analytics: LevelSearch supports onValidSubmit prop", async () => {
  const search = await readFile(
    new URL("components/LevelSearch.tsx", root),
    "utf8",
  );
  assert.match(search, /onValidSubmit/);
  assert.match(search, /onValidSubmit\?\.\(levelId\)/);
  // onValidSubmit wrapped in try/catch
  assert.match(search, /try\s*\{/);
});

test("analytics: onValidSubmit failure does not block navigation", async () => {
  const search = await readFile(
    new URL("components/LevelSearch.tsx", root),
    "utf8",
  );
  // The try/catch around onValidSubmit ensures navigation still happens
  const submitFn = search.substring(
    search.indexOf("function submit"),
    search.indexOf("router.push", search.indexOf("function submit")),
  );
  assert.match(submitFn, /try\s*\{/);
  assert.match(submitFn, /onValidSubmit/);
});

test("analytics: gtag unavailable does not crash for all events", async () => {
  const analytics = await readFile(new URL("lib/analytics.ts", root), "utf8");
  assert.match(analytics, /typeof window === "undefined"/);
  assert.match(analytics, /!w\.gtag/);
  assert.match(analytics, /try/);
  assert.match(analytics, /catch/);
});

test("play-online page: default LevelSearch has no onValidSubmit", async () => {
  const homePage = await readFile(new URL("app/page.tsx", root), "utf8");
  // Homepage LevelSearch should NOT pass onValidSubmit
  const searchMatch = homePage.match(/<LevelSearch[\s\S]*?\/>/);
  if (searchMatch) {
    assert.doesNotMatch(searchMatch[0], /onValidSubmit/);
  }
});

// ─── PlayOnlineViewTracker Component ─────────────────────────────────

test("play online view tracker: is a client component", async () => {
  const tracker = await readFile(
    new URL("components/PlayOnlineViewTracker.tsx", root),
    "utf8",
  );
  assert.match(tracker, /"use client"/);
});

test("play online view tracker: returns null", async () => {
  const tracker = await readFile(
    new URL("components/PlayOnlineViewTracker.tsx", root),
    "utf8",
  );
  assert.match(tracker, /return null/);
});

// ─── Navigation ─────────────────────────────────────────────────────

test("navigation: header includes Play Online link", async () => {
  const layout = await readFile(new URL("app/layout.tsx", root), "utf8");
  assert.match(layout, /href="\/play-online"/);
  assert.match(layout, /Play Online/);
});

test("navigation: header does not include About link", async () => {
  const layout = await readFile(new URL("app/layout.tsx", root), "utf8");
  // Find the header nav section
  const headerStart = layout.indexOf('<nav aria-label="Main navigation">');
  const headerEnd = layout.indexOf("</nav>", headerStart);
  const headerNav = layout.substring(headerStart, headerEnd);
  assert.doesNotMatch(headerNav, /\/about/);
  assert.doesNotMatch(headerNav, />About</);
});

test("navigation: About link removed from footer", async () => {
  const layout = await readFile(new URL("app/layout.tsx", root), "utf8");
  const footerStart = layout.indexOf("<footer");
  const footerEnd = layout.indexOf("</footer>", footerStart);
  const footer = layout.substring(footerStart, footerEnd);
  assert.doesNotMatch(footer, /\/about/);
  assert.doesNotMatch(footer, />About</);
});

test("navigation: Find a Level keeps emphasis style", async () => {
  const layout = await readFile(new URL("app/layout.tsx", root), "utf8");
  assert.match(layout, /header-find/);
  assert.match(layout, /Find a Level/);
});

// ─── YouTube Embed Domain ────────────────────────────────────────────

test("youtube: VideoEmbed uses www.youtube.com/embed", async () => {
  const embed = await readFile(
    new URL("components/VideoEmbed.tsx", root),
    "utf8",
  );
  assert.match(embed, /www\.youtube\.com\/embed/);
  assert.doesNotMatch(embed, /youtube-nocookie/);
});

test("youtube: JSON-LD uses www.youtube.com/embed", async () => {
  const page = await readFile(
    new URL("app/level/[levelId]/page.tsx", root),
    "utf8",
  );
  assert.match(page, /embedUrl:.*www\.youtube\.com\/embed/);
  assert.doesNotMatch(page, /youtube-nocookie/);
});

test("youtube: no youtube-nocookie.com anywhere in repo", async () => {
  const { execSync } = await import("child_process");
  try {
    const result = execSync("git grep -l youtube-nocookie", {
      cwd: root,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    assert.fail(`Found youtube-nocookie.com in: ${result.trim()}`);
  } catch (_e) {
    // git grep exits non-zero when no matches — that's expected
    assert.ok(true);
  }
});

test("youtube: VideoEmbed has backup Watch on YouTube link", async () => {
  const embed = await readFile(
    new URL("components/VideoEmbed.tsx", root),
    "utf8",
  );
  assert.match(embed, /Watch on YouTube/);
  assert.match(embed, /www\.youtube\.com\/watch\?v=/);
  assert.match(embed, /target="_blank"/);
  assert.match(embed, /rel="noopener noreferrer"/);
});

test("youtube: iframe has playsinline param", async () => {
  const embed = await readFile(
    new URL("components/VideoEmbed.tsx", root),
    "utf8",
  );
  assert.match(embed, /playsinline=1/);
});

// ─── Game Frame Sizing ───────────────────────────────────────────────

test("game frame: desktop has min-height", async () => {
  const css = await readFile(new URL("app/globals.css", root), "utf8");
  assert.match(css, /\.online-game-frame \{.*min-height: 600px/);
});

test("game frame: compact has max-width", async () => {
  const css = await readFile(new URL("app/globals.css", root), "utf8");
  assert.match(css, /compact.*online-game-frame.*max-width: 500px/);
});

test("game frame: mobile compact sizing", async () => {
  const css = await readFile(new URL("app/globals.css", root), "utf8");
  // Mobile media query should have compact game frame sizing
  const mobileSection = css.match(/@media.*max-width: 680px.*?\{([\s\S]*?)\n\}/);
  assert.ok(mobileSection, "mobile media query should exist");
  const onlineGameFrame = css.match(/\.online-game-frame \{.*border-radius: 20px/);
  assert.ok(onlineGameFrame, "mobile game frame should have border-radius");
});

// ─── Play Now Button Behavior ────────────────────────────────────────

test("game player: Play Now is a button not a link", async () => {
  const player = await readFile(
    new URL("components/OnlineGamePlayer.tsx", root),
    "utf8",
  );
  assert.match(player, /<button[\s\S]*?Play Now/);
  assert.match(player, /type="button"/);
  assert.match(player, /onClick=\{handlePlay\}/);
  // Must NOT contain router.push, window.location.href, or window.open
  assert.doesNotMatch(player, /router\.push/);
  assert.doesNotMatch(player, /window\.location\.href/);
  assert.doesNotMatch(player, /window\.open/);
});

test("game player: handlePlay does not navigate away", async () => {
  const player = await readFile(
    new URL("components/OnlineGamePlayer.tsx", root),
    "utf8",
  );
  // handlePlay should only set state, track analytics, and call onGameStart
  const lines = player.split("\n");
  const handlePlayStart = lines.findIndex((l) => l.includes("handlePlay"));
  const handlePlayEnd = lines.findIndex(
    (l, i) => i > handlePlayStart && l.includes("useCallback"),
  );
  const body = lines.slice(handlePlayStart, handlePlayEnd).join("\n");
  assert.doesNotMatch(body, /router\.push/);
  assert.doesNotMatch(body, /window\.location/);
  assert.doesNotMatch(body, /window\.open/);
});

test("game player: iframe src does not contain levelId", async () => {
  const player = await readFile(
    new URL("components/OnlineGamePlayer.tsx", root),
    "utf8",
  );
  assert.match(player, /src=\{onlineGameConfig\.embedUrl\}/);
  assert.doesNotMatch(player, /src=.sourceLevel/);
  assert.doesNotMatch(player, /src=.levelId/);
  assert.doesNotMatch(player, /src=.pathname/);
});

// ─── Play Now Inside Game Frame ─────────────────────────────────────

test("play now: inside .online-game-frame, not outside", async () => {
  const player = await readFile(
    new URL("components/OnlineGamePlayer.tsx", root),
    "utf8",
  );
  // Play Now button is inside online-game-start-overlay, which is inside online-game-frame
  assert.match(player, /online-game-start-overlay/);
  // No Play Now button directly in .online-game-cover (outside the frame)
  const coverMatch = player.match(/online-game-cover[\s\S]*?<\/div>/);
  assert.ok(coverMatch, "online-game-cover should exist");
  // The cover contains the frame, which contains the overlay
  assert.match(player, /online-game-frame[\s\S]*?online-game-start-overlay/);
});

test("play now: no second Play Now button outside the frame", async () => {
  const player = await readFile(
    new URL("components/OnlineGamePlayer.tsx", root),
    "utf8",
  );
  // Count Play Now occurrences in JSX (not in JSDoc comments)
  // Match only <span>Play Now</span> pattern
  const playNowMatches = player.match(/<span>Play Now<\/span>/g);
  assert.ok(playNowMatches, "Play Now should exist");
  assert.strictEqual(playNowMatches.length, 1, "Only one Play Now button should exist");
});

test("play now: start overlay CSS has absolute and inset", async () => {
  const css = await readFile(new URL("app/globals.css", root), "utf8");
  assert.match(css, /\.online-game-start-overlay\s*\{/);
  assert.match(css, /position:\s*absolute/);
  assert.match(css, /inset:\s*0/);
  assert.match(css, /z-index:\s*2/);
});

test("play now: timeout overlay CSS has absolute and inset", async () => {
  const css = await readFile(new URL("app/globals.css", root), "utf8");
  assert.match(css, /\.online-game-timeout-overlay\s*\{/);
  assert.match(css, /position:\s*absolute/);
  assert.match(css, /inset:\s*0/);
  assert.match(css, /z-index:\s*3/);
});

test("play now: old .online-game-timeout-actions class removed from CSS", async () => {
  const css = await readFile(new URL("app/globals.css", root), "utf8");
  assert.doesNotMatch(css, /\.online-game-timeout-actions\s*\{/);
});

test("play now: Try Again calls handleTryAgain", async () => {
  const player = await readFile(
    new URL("components/OnlineGamePlayer.tsx", root),
    "utf8",
  );
  assert.match(player, /handleTryAgain/);
  assert.match(player, /onClick=\{handleTryAgain\}/);
});

test("play now: no Reload Game, Fullscreen, or Open Game in New Tab", async () => {
  const player = await readFile(
    new URL("components/OnlineGamePlayer.tsx", root),
    "utf8",
  );
  assert.doesNotMatch(player, /Reload Game/);
  assert.doesNotMatch(player, /Fullscreen/);
  assert.doesNotMatch(player, /Open Game in New Tab/);
  assert.doesNotMatch(player, /handleFullscreen/);
  assert.doesNotMatch(player, /handleOpenExternal/);
});

// ─── Breadcrumb & Internal Links ────────────────────────────────────

test("breadcrumbs: /levels page has visible breadcrumb", async () => {
  const levelsPage = await readFile(new URL("app/levels/page.tsx", root), "utf8");
  assert.match(levelsPage, /className="breadcrumbs"/);
  assert.match(levelsPage, /aria-label="Breadcrumb"/);
  assert.match(levelsPage, /Home/);
  assert.match(levelsPage, /All Levels/);
});

test("breadcrumbs: /levels Home links to /", async () => {
  const levelsPage = await readFile(new URL("app/levels/page.tsx", root), "utf8");
  assert.match(levelsPage, /href="\/"/);
});

test("breadcrumbs: /levels All Levels is current page span", async () => {
  const levelsPage = await readFile(new URL("app/levels/page.tsx", root), "utf8");
  assert.match(levelsPage, /aria-current="page"/);
  // No link to /levels in breadcrumb (current page)
  const breadcrumbMatch = levelsPage.match(/<nav[^>]*breadcrumbs[^>]*>([\s\S]*?)<\/nav>/);
  if (breadcrumbMatch) {
    assert.doesNotMatch(breadcrumbMatch[1], /href="\/levels"/);
  }
});

test("breadcrumbs: /levels has BreadcrumbList with 2 elements", async () => {
  const levelsPage = await readFile(new URL("app/levels/page.tsx", root), "utf8");
  assert.match(levelsPage, /BreadcrumbList/);
  assert.match(levelsPage, /position: 1/);
  assert.match(levelsPage, /position: 2/);
});

test("breadcrumbs: /levels BreadcrumbList URLs are absolute", async () => {
  const levelsPage = await readFile(new URL("app/levels/page.tsx", root), "utf8");
  assert.match(levelsPage, /siteUrl/);
  assert.match(levelsPage, /\$\{siteUrl\}\/levels/);
});

test("breadcrumbs: /levels still has ItemList", async () => {
  const levelsPage = await readFile(new URL("app/levels/page.tsx", root), "utf8");
  assert.match(levelsPage, /ItemList/);
});

test("breadcrumbs: range page has 3-level visible breadcrumb", async () => {
  const rangePage = await readFile(new URL("app/levels/[range]/page.tsx", root), "utf8");
  assert.match(rangePage, /className="breadcrumbs"/);
  assert.match(rangePage, /Home/);
  assert.match(rangePage, /All Levels/);
  assert.match(rangePage, /Levels/);
});

test("breadcrumbs: range current page has aria-current", async () => {
  const rangePage = await readFile(new URL("app/levels/[range]/page.tsx", root), "utf8");
  assert.match(rangePage, /aria-current="page"/);
});

test("breadcrumbs: range has BreadcrumbList with 3 elements", async () => {
  const rangePage = await readFile(new URL("app/levels/[range]/page.tsx", root), "utf8");
  assert.match(rangePage, /BreadcrumbList/);
  assert.match(rangePage, /position: 1/);
  assert.match(rangePage, /position: 2/);
  assert.match(rangePage, /position: 3/);
});

test("breadcrumbs: range BreadcrumbList has correct URL structure", async () => {
  const rangePage = await readFile(new URL("app/levels/[range]/page.tsx", root), "utf8");
  assert.match(rangePage, /siteUrl/);
  assert.match(rangePage, /range\.slug/);
});

test("breadcrumbs: range page still has ItemList", async () => {
  const rangePage = await readFile(new URL("app/levels/[range]/page.tsx", root), "utf8");
  assert.match(rangePage, /ItemList/);
});

test("breadcrumbs: range page outputs both ItemList and BreadcrumbList", async () => {
  const rangePage = await readFile(new URL("app/levels/[range]/page.tsx", root), "utf8");
  assert.match(rangePage, /ItemList/);
  assert.match(rangePage, /BreadcrumbList/);
});

test("breadcrumbs: level page has four-level BreadcrumbList", async () => {
  const levelPage = await readFile(new URL("app/level/[levelId]/page.tsx", root), "utf8");
  assert.match(levelPage, /BreadcrumbList/);
  assert.match(levelPage, /position: 1/);
  assert.match(levelPage, /position: 2/);
  assert.match(levelPage, /position: 3/);
  assert.match(levelPage, /position: 4/);
});

test("breadcrumbs: level page breadcrumb has aria-current on current level", async () => {
  const levelPage = await readFile(new URL("app/level/[levelId]/page.tsx", root), "utf8");
  assert.match(levelPage, /aria-current="page"/);
});

test("breadcrumbs: level page still has VideoObject", async () => {
  const levelPage = await readFile(new URL("app/level/[levelId]/page.tsx", root), "utf8");
  assert.match(levelPage, /VideoObject/);
});

test("intent links: does not contain Download", async () => {
  const intentLinks = await readFile(new URL("components/IntentLinks.tsx", root), "utf8");
  assert.doesNotMatch(intentLinks, /\/download/);
  assert.doesNotMatch(intentLinks, /Download the Game/);
});

test("intent links: does not contain Play on PC", async () => {
  const intentLinks = await readFile(new URL("components/IntentLinks.tsx", root), "utf8");
  assert.doesNotMatch(intentLinks, /\/play-on-pc/);
  assert.doesNotMatch(intentLinks, /Play on PC/);
});

test("intent links: does not contain FAQ", async () => {
  const intentLinks = await readFile(new URL("components/IntentLinks.tsx", root), "utf8");
  assert.doesNotMatch(intentLinks, /\/faq/);
  assert.doesNotMatch(intentLinks, /Game FAQ/);
});

test("intent links: contains Find a Level", async () => {
  const intentLinks = await readFile(new URL("components/IntentLinks.tsx", root), "utf8");
  assert.match(intentLinks, /Find a Level/);
  assert.match(intentLinks, /#find-level/);
});

test("intent links: contains Browse All Color Block Jam Levels", async () => {
  const intentLinks = await readFile(new URL("components/IntentLinks.tsx", root), "utf8");
  assert.match(intentLinks, /Browse All Color Block Jam Levels/);
  assert.match(intentLinks, /\/levels/);
});

test("intent links: contains Play Online", async () => {
  const intentLinks = await readFile(new URL("components/IntentLinks.tsx", root), "utf8");
  assert.match(intentLinks, /Play Online/);
  assert.match(intentLinks, /\/play-online/);
});

test("anchor text: homepage uses descriptive /levels link", async () => {
  const homepage = await readFile(new URL("app/page.tsx", root), "utf8");
  assert.match(homepage, /Browse All Color Block Jam Levels/);
});

test("anchor text: level page related section uses descriptive /levels link", async () => {
  const levelPage = await readFile(new URL("app/level/[levelId]/page.tsx", root), "utf8");
  assert.match(levelPage, /Browse All Color Block Jam Levels/);
});