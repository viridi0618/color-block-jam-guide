import levels from "../data/levels/all-levels.json" with { type: "json" };
import candidates from "../data/candidates/levels.json" with { type: "json" };
import unmatched from "../data/review/unmatched-videos.json" with { type: "json" };
import conflicts from "../data/review/conflicts.json" with { type: "json" };
import multipleCandidates from "../data/review/multiple-candidates.json" with { type: "json" };
import privateDeleted from "../data/review/private-deleted-videos.json" with { type: "json" };

const errors: string[] = [];
let primaryLabelPages = 0;
let parentheticalLabelPages = 0;
const dualVideos = new Set<string>();
const seenLevelIds = new Set<number>();
const seenSlugs = new Set<string>();

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
}

// Dynamic playlist entry count from candidates
const playlistEntries = candidates.length;
const uniqueVideoIds = new Set(candidates.map((item: { videoId: string }) => item.videoId)).size;

console.log(`Playlist entries: ${playlistEntries}`);
console.log(`Unique video IDs: ${uniqueVideoIds}`);
console.log(`Approved level pages: ${levels.length}`);
console.log(`Single-number mappings: ${new Set(candidates.filter((item: { sourceLevelIds: number[] }) => item.sourceLevelIds.length === 1).map((item: { videoId: string }) => item.videoId)).size}`);
console.log(`Dual-number source videos: ${dualVideos.size}`);
console.log(`Primary-label pages: ${primaryLabelPages}`);
console.log(`Parenthetical-label pages: ${parentheticalLabelPages}`);
console.log(`Duplicate level candidates: ${multipleCandidates.length}`);
console.log(`Unmatched: ${unmatched.length}`);
console.log(`Private/Deleted: ${privateDeleted.length}`);
console.log(`Conflicts: ${conflicts.length}`);
console.log(`Errors: ${errors.length}`);

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