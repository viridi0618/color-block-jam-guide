import levels from "../data/levels/all-levels.json" with { type: "json" };
import candidates from "../data/candidates/levels.json" with { type: "json" };
import unmatched from "../data/review/unmatched-videos.json" with { type: "json" };
import conflicts from "../data/review/conflicts.json" with { type: "json" };
import multipleCandidates from "../data/review/multiple-candidates.json" with { type: "json" };

const errors: string[] = [];
let primaryLabelPages = 0;
let parentheticalLabelPages = 0;
const dualVideos = new Set<string>();

for (const level of levels) {
  if (!Number.isInteger(level.levelId) || level.levelId <= 0) {
    errors.push(`Invalid levelId: ${level.levelId}`);
  }
  if (level.slug !== `/level/${level.levelId}` || level.status !== "approved") {
    errors.push(`Level ${level.levelId} is not publishable`);
  }
  if (!level.sourceLevelIds.includes(level.levelId)) {
    errors.push(`Level ${level.levelId} is not in its explicit source labels`);
  }
  if (level.matchType === "primary-label") primaryLabelPages += 1;
  else parentheticalLabelPages += 1;
  for (const video of [level.primaryVideo, ...level.alternativeVideos]) {
    if (!/^[A-Za-z0-9_-]{11}$/.test(video.videoId)) {
      errors.push(`Invalid video ID at level ${level.levelId}`);
    }
    if (!video.sourceLevelIds.includes(level.levelId)) {
      errors.push(`Video ${video.videoId} is not title-mapped to level ${level.levelId}`);
    }
    if (video.sourceLevelIds.length === 2) dualVideos.add(video.videoId);
  }
}

console.log(`Playlist entries: 4093`);
console.log(`Unique video IDs: ${new Set(candidates.map((item) => item.videoId)).size}`);
console.log(`Approved level pages: ${levels.length}`);
console.log(`Single-number mappings: ${new Set(candidates.filter((item) => item.sourceLevelIds.length === 1).map((item) => item.videoId)).size}`);
console.log(`Dual-number source videos: ${dualVideos.size}`);
console.log(`Primary-label pages: ${primaryLabelPages}`);
console.log(`Parenthetical-label pages: ${parentheticalLabelPages}`);
console.log(`Duplicate level candidates: ${multipleCandidates.length}`);
console.log(`Unmatched: ${unmatched.length}`);
console.log(`Conflicts: ${conflicts.length}`);
console.log(`Errors: ${errors.length}`);

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
