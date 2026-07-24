import levels from "../data/levels/all-levels.json" with { type: "json" };
import candidates from "../data/candidates/levels.json" with { type: "json" };
import unmatched from "../data/review/unmatched-videos.json" with { type: "json" };
import conflicts from "../data/review/conflicts.json" with { type: "json" };

const errors: string[] = [];
const seenVideos = new Map<string, number>();
let approvedVideos = 0;

for (const level of levels) {
  if (!Number.isInteger(level.levelId) || level.levelId <= 0) {
    errors.push(`Invalid levelId: ${level.levelId}`);
  }
  if (level.slug !== `/level/${level.levelId}`) {
    errors.push(`Slug mismatch for level ${level.levelId}`);
  }
  if (level.status !== "approved" || !level.primaryVideo) {
    errors.push(`Level ${level.levelId} is not publishable`);
    continue;
  }
  const videos = [level.primaryVideo, ...level.alternativeVideos];
  const withinLevel = new Set<string>();
  for (const video of videos) {
    approvedVideos += 1;
    if (!/^[A-Za-z0-9_-]{11}$/.test(video.videoId)) {
      errors.push(`Invalid video ID at level ${level.levelId}`);
    }
    if (!video.title.trim() || /placeholder|todo|tbd/i.test(video.title)) {
      errors.push(`Invalid title at level ${level.levelId}`);
    }
    if (withinLevel.has(video.videoId)) {
      errors.push(`Duplicate video in level ${level.levelId}`);
    }
    withinLevel.add(video.videoId);
    const mappedLevel = seenVideos.get(video.videoId);
    if (mappedLevel && mappedLevel !== level.levelId) {
      errors.push(
        `Video ${video.videoId} maps to levels ${mappedLevel} and ${level.levelId}`,
      );
    }
    seenVideos.set(video.videoId, level.levelId);
  }
}

console.log(`Approved levels: ${levels.length}`);
console.log(`Approved videos: ${approvedVideos}`);
console.log(`Unmatched videos: ${unmatched.length}`);
console.log(`Conflicts: ${conflicts.length}`);
console.log(`Errors: ${errors.length}`);

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

if (!Array.isArray(candidates)) {
  console.error("Candidate data is invalid");
  process.exit(1);
}
