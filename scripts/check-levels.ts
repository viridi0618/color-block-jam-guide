import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseLevelTitle } from "../lib/level-parser.ts";

const root = resolve(import.meta.dirname, "..");
const readJson = async (p: string) =>
  JSON.parse(await readFile(resolve(root, p), "utf8"));

const levels = await readJson("data/levels/all-levels.json");
const candidates = await readJson("data/candidates/levels.json");
const unmatched = await readJson("data/review/unmatched-videos.json");
const conflicts = await readJson("data/review/conflicts.json");
const multipleCandidates = await readJson("data/review/multiple-candidates.json");
const privateDeleted = await readJson("data/review/private-deleted-videos.json");
const sources = await readJson("data/sources/youtube-sources.json");

const errors: string[] = [];
let primaryLabelPages = 0;
let parentheticalLabelPages = 0;
const dualVideos = new Set<string>();
const seenLevelIds = new Set<number>();
const seenSlugs = new Set<string>();

// ─── Dynamic stats from raw import files ───────────────────────────

let rawPlaylistEntries = 0;
const allVideoIds = new Set<string>();

for (const source of sources.sources ?? []) {
  if (!source.enabled || source.qualityStatus === "blocked") continue;
  try {
    const imported = await readJson(source.importFile);
    rawPlaylistEntries += imported.entries?.length ?? 0;
    for (const entry of imported.entries ?? []) {
      if (entry.id && /^[A-Za-z0-9_-]{11}$/.test(entry.id)) {
        allVideoIds.add(entry.id);
      }
    }
  } catch {
    // Skip missing import files
  }
}

// ─── Level-by-level checks ─────────────────────────────────────────

const candidateMap = new Map<number, Array<{ videoId: string; title: string }>>();
for (const c of candidates) {
  const arr = candidateMap.get(c.levelId) ?? [];
  if (!arr.some((a) => a.videoId === c.videoId)) {
    arr.push({ videoId: c.videoId, title: c.title });
  }
  candidateMap.set(c.levelId, arr);
}

for (const level of levels) {
  if (!Number.isInteger(level.levelId) || level.levelId <= 0) {
    errors.push(`Invalid levelId: ${level.levelId}`);
  }
  if (level.slug !== `/level/${level.levelId}` || level.status !== "approved") {
    errors.push(`Level ${level.levelId} is not publishable`);
  }
  if (level.sourceLevelIds && !level.sourceLevelIds.includes(level.levelId)) {
    errors.push(`Level ${level.levelId} is not in its explicit source labels`);
  }
  if (level.matchType === "primary-label") primaryLabelPages += 1;
  else parentheticalLabelPages += 1;

  // Check for duplicates
  if (seenLevelIds.has(level.levelId)) {
    errors.push(`Duplicate levelId: ${level.levelId}`);
  }
  seenLevelIds.add(level.levelId);
  if (seenSlugs.has(level.slug)) {
    errors.push(`Duplicate slug: ${level.slug}`);
  }
  seenSlugs.add(level.slug);

  for (const video of [level.primaryVideo, ...(level.alternativeVideos ?? [])]) {
    if (!video) continue;
    if (!/^[A-Za-z0-9_-]{11}$/.test(video.videoId)) {
      errors.push(`Invalid video ID at level ${level.levelId}`);
    }
    if (video.sourceLevelIds && !video.sourceLevelIds.includes(level.levelId)) {
      errors.push(`Video ${video.videoId} is not title-mapped to level ${level.levelId}`);
    }
    if (video.sourceLevelIds && video.sourceLevelIds.length === 2) dualVideos.add(video.videoId);
  }

  // Check range video consistency
  if (level.isRangeVideo && level.rangeStart != null && level.rangeEnd != null) {
    if (level.levelId < level.rangeStart || level.levelId > level.rangeEnd) {
      errors.push(`Level ${level.levelId} is outside range video bounds ${level.rangeStart}-${level.rangeEnd}`);
    }
  }

  // Check primary video is not in alternatives
  if (level.primaryVideo && level.alternativeVideos) {
    for (const alt of level.alternativeVideos) {
      if (alt.videoId === level.primaryVideo.videoId) {
        errors.push(`Primary video ${alt.videoId} also in alternatives for level ${level.levelId}`);
      }
    }
  }

  // ─── Independent re-parse verification ───────────────────────────
  // Re-parse every candidate video title and compare with sourceLevelIds
  const levelCandidates = candidateMap.get(level.levelId) ?? [];
  for (const cand of levelCandidates) {
    const reParsed = parseLevelTitle(cand.title);
    if (!reParsed) {
      errors.push(`Level ${level.levelId}: candidate "${cand.title}" failed re-parse`);
      continue;
    }
    if (reParsed.type === "rejected-range") {
      errors.push(`Level ${level.levelId}: candidate "${cand.title}" re-parsed as rejected-range but still mapped`);
      continue;
    }
    const reSourceIds = reParsed.type === "range"
      ? reParsed.sourceLevelIds
      : reParsed.sourceLevelIds;
    if (!reSourceIds.includes(level.levelId)) {
      errors.push(`Level ${level.levelId}: re-parsed sourceLevelIds ${JSON.stringify(reSourceIds)} do not include ${level.levelId} (title: "${cand.title}")`);
    }
  }
}

// ─── VideoObject field checks ──────────────────────────────────────

let missingPublishedAt = 0;
let missingDuration = 0;
let unembeddablePrimary = 0;
let unavailablePrimary = 0;

for (const level of levels) {
  const pv = level.primaryVideo;
  if (!pv) continue;
  if (!pv.publishedAt) missingPublishedAt++;
  if (pv.durationSeconds == null) missingDuration++;
  if (pv.embeddable === false) unembeddablePrimary++;
  if (pv.videoAvailable === false) unavailablePrimary++;

  // Check alternatives for embeddable/available
  for (const alt of level.alternativeVideos ?? []) {
    if (alt.embeddable === false) {
      errors.push(`Level ${level.levelId}: alternative video ${alt.videoId} is not embeddable`);
    }
    if (alt.videoAvailable === false) {
      errors.push(`Level ${level.levelId}: alternative video ${alt.videoId} is unavailable`);
    }
  }
}

// ─── Summary ────────────────────────────────────────────────────────

console.log(`Raw playlist entries: ${rawPlaylistEntries}`);
console.log(`Unique video IDs (all sources): ${allVideoIds.size}`);
console.log(`Candidate mappings: ${candidates.length}`);
console.log(`Approved level pages: ${levels.length}`);
console.log(`Single-number mappings: ${new Set(candidates.filter((item: { sourceLevelIds: number[] }) => item.sourceLevelIds.length === 1).map((item: { videoId: string }) => item.videoId)).size}`);
console.log(`Dual-number source videos: ${dualVideos.size}`);
console.log(`Primary-label pages: ${primaryLabelPages}`);
console.log(`Parenthetical-label pages: ${parentheticalLabelPages}`);
console.log(`Duplicate level candidates: ${multipleCandidates.length}`);
console.log(`Unmatched: ${unmatched.length}`);
console.log(`Private/Deleted: ${privateDeleted.length}`);
console.log(`Conflicts: ${conflicts.length}`);
console.log(`Check errors: ${errors.length}`);
console.log(`Missing publishedAt: ${missingPublishedAt}`);
console.log(`Missing duration: ${missingDuration}`);
console.log(`Unembeddable primary: ${unembeddablePrimary}`);
console.log(`Unavailable primary: ${unavailablePrimary}`);

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

// Check for real conflicts
const errorConflicts = conflicts.filter((c: { severity: string }) => c.severity === "error");
if (errorConflicts.length) {
  console.error(`\n${errorConflicts.length} error-level conflicts detected:`);
  for (const c of errorConflicts) {
    console.error(`  [${c.type}] ${c.reason}`);
  }
  process.exit(1);
}

// Check for unembeddable/unavailable errors
if (unembeddablePrimary > 0) {
  console.error(`\n${unembeddablePrimary} levels have unembeddable primary videos`);
  process.exit(1);
}
if (unavailablePrimary > 0) {
  console.error(`\n${unavailablePrimary} levels have unavailable primary videos`);
  process.exit(1);
}