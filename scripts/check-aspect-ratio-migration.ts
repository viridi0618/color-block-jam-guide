/**
 * Verifies that data/candidates/levels.json and data/levels/all-levels.json
 * only changed aspectRatio (16:9 → 9:16) compared to origin/main.
 *
 * Exits with code 1 if any unexpected semantic changes are found.
 * For push-to-main CI, falls back to parent commit when origin/main is unavailable.
 */

import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

interface Candidate {
  levelId: number;
  videoId: string;
  sourceId: string;
  title: string;
  channelTitle: string;
  durationSeconds: number | null;
  publishedAt: string | null;
  thumbnailUrl: string;
  aspectRatio: string;
  priority: number;
  matchType: string;
  mappingGroupId: string;
  sourceLevelIds: number[];
  embeddable: boolean | null;
  videoAvailable: boolean;
  rangeStart: number;
  rangeEnd: number;
  isRangeVideo: boolean;
  playlistPosition: number;
}

interface PrimaryVideo {
  videoId: string;
  sourceId: string;
  title: string;
  channelTitle: string;
  durationSeconds: number | null;
  publishedAt: string | null;
  thumbnailUrl: string;
  aspectRatio: string;
  matchType: string;
  mappingGroupId: string;
  sourceLevelIds: number[];
  rangeStart: number;
  rangeEnd: number;
}

interface Level {
  levelId: number;
  slug: string;
  status: string;
  matchType: string;
  sourceLevelIds: number[];
  primaryVideo: PrimaryVideo;
  alternativeVideos: PrimaryVideo[];
  isRangeVideo: boolean;
  rangeStart: number;
  rangeEnd: number;
}

function getBaseRef(): string {
  // In PR CI, use origin/main
  try {
    execSync("git rev-parse origin/main", { stdio: "pipe" });
    return "origin/main";
  } catch {
    // On push-to-main, fall back to HEAD~1
    try {
      execSync("git rev-parse HEAD~1", { stdio: "pipe" });
      return "HEAD~1";
    } catch {
      console.error("ERROR: Cannot determine base ref. Neither origin/main nor HEAD~1 exists.");
      process.exit(1);
    }
  }
}

function getGitFile(ref: string, path: string): string {
  try {
    return execSync(`git show ${ref}:${path}`, {
      encoding: "utf-8",
      stdio: "pipe",
      maxBuffer: 50 * 1024 * 1024, // 50MB for large JSON files
    }).toString();
  } catch (e) {
    console.error(`ERROR: Cannot read ${path} from ${ref}`);
    if (e instanceof Error) {
      console.error(`  ${e.message}`);
    }
    process.exit(1);
  }
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return false;
  if (typeof a !== "object" || typeof b !== "object") return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const aObj = a as Record<string, unknown>;
  const bObj = b as Record<string, unknown>;
  const keysA = Object.keys(aObj).sort();
  const keysB = Object.keys(bObj).sort();
  if (keysA.length !== keysB.length) return false;
  for (let i = 0; i < keysA.length; i++) {
    if (keysA[i] !== keysB[i]) return false;
  }
  for (const key of keysA) {
    if (!deepEqual(aObj[key], bObj[key])) return false;
  }
  return true;
}

function compareCandidates(before: Candidate[], after: Candidate[]): {
  countBefore: number;
  countAfter: number;
  aspectRatioChanges: number;
  unexpectedChanges: string[];
} {
  const result = {
    countBefore: before.length,
    countAfter: after.length,
    aspectRatioChanges: 0,
    unexpectedChanges: [] as string[],
  };

  if (before.length !== after.length) {
    result.unexpectedChanges.push(
      `Candidate count mismatch: ${before.length} vs ${after.length}`,
    );
    return result;
  }

  for (let i = 0; i < before.length; i++) {
    const b = before[i];
    const a = after[i];

    // Check all fields except aspectRatio
    const fieldsToCheck: (keyof Candidate)[] = [
      "levelId",
      "videoId",
      "sourceId",
      "title",
      "channelTitle",
      "durationSeconds",
      "publishedAt",
      "thumbnailUrl",
      "priority",
      "matchType",
      "mappingGroupId",
      "sourceLevelIds",
      "embeddable",
      "videoAvailable",
      "rangeStart",
      "rangeEnd",
      "isRangeVideo",
      "playlistPosition",
    ];

    for (const field of fieldsToCheck) {
      if (!deepEqual(b[field], a[field])) {
        result.unexpectedChanges.push(
          `Candidate[${i}] field "${field}" changed: ${JSON.stringify(b[field])} → ${JSON.stringify(a[field])}`,
        );
      }
    }

    if (b.aspectRatio !== a.aspectRatio) {
      if (b.aspectRatio === "16:9" && a.aspectRatio === "9:16") {
        result.aspectRatioChanges++;
      } else {
        result.unexpectedChanges.push(
          `Candidate[${i}] unexpected aspectRatio change: ${b.aspectRatio} → ${a.aspectRatio}`,
        );
      }
    }
  }

  return result;
}

function compareLevels(before: Level[], after: Level[]): {
  countBefore: number;
  countAfter: number;
  aspectRatioChanges: number;
  unexpectedChanges: string[];
} {
  const result = {
    countBefore: before.length,
    countAfter: after.length,
    aspectRatioChanges: 0,
    unexpectedChanges: [] as string[],
  };

  if (before.length !== after.length) {
    result.unexpectedChanges.push(
      `Level count mismatch: ${before.length} vs ${after.length}`,
    );
    return result;
  }

  for (let i = 0; i < before.length; i++) {
    const b = before[i];
    const a = after[i];

    // Check top-level fields (except those that contain aspectRatio)
    const topLevelFields: (keyof Level)[] = [
      "levelId",
      "slug",
      "status",
      "matchType",
      "sourceLevelIds",
      "isRangeVideo",
      "rangeStart",
      "rangeEnd",
    ];

    for (const field of topLevelFields) {
      if (!deepEqual(b[field], a[field])) {
        result.unexpectedChanges.push(
          `Level[${i}] field "${field}" changed: ${JSON.stringify(b[field])} → ${JSON.stringify(a[field])}`,
        );
      }
    }

    // Check primaryVideo
    const primaryVideoFields: (keyof PrimaryVideo)[] = [
      "videoId",
      "sourceId",
      "title",
      "channelTitle",
      "durationSeconds",
      "publishedAt",
      "thumbnailUrl",
      "matchType",
      "mappingGroupId",
      "sourceLevelIds",
      "rangeStart",
      "rangeEnd",
    ];

    for (const field of primaryVideoFields) {
      if (!deepEqual(b.primaryVideo[field], a.primaryVideo[field])) {
        result.unexpectedChanges.push(
          `Level[${i}].primaryVideo field "${field}" changed: ${JSON.stringify(b.primaryVideo[field])} → ${JSON.stringify(a.primaryVideo[field])}`,
        );
      }
    }

    if (b.primaryVideo.aspectRatio !== a.primaryVideo.aspectRatio) {
      if (b.primaryVideo.aspectRatio === "16:9" && a.primaryVideo.aspectRatio === "9:16") {
        result.aspectRatioChanges++;
      } else {
        result.unexpectedChanges.push(
          `Level[${i}].primaryVideo unexpected aspectRatio change: ${b.primaryVideo.aspectRatio} → ${a.primaryVideo.aspectRatio}`,
        );
      }
    }

    // Check alternativeVideos count and order
    if (b.alternativeVideos.length !== a.alternativeVideos.length) {
      result.unexpectedChanges.push(
        `Level[${i}] alternativeVideos count changed: ${b.alternativeVideos.length} → ${a.alternativeVideos.length}`,
      );
    } else {
      for (let j = 0; j < b.alternativeVideos.length; j++) {
        const bAlt = b.alternativeVideos[j];
        const aAlt = a.alternativeVideos[j];

        for (const field of primaryVideoFields) {
          if (!deepEqual(bAlt[field], aAlt[field])) {
            result.unexpectedChanges.push(
              `Level[${i}].alternativeVideos[${j}] field "${field}" changed: ${JSON.stringify(bAlt[field])} → ${JSON.stringify(aAlt[field])}`,
            );
          }
        }

        if (bAlt.aspectRatio !== aAlt.aspectRatio) {
          if (bAlt.aspectRatio === "16:9" && aAlt.aspectRatio === "9:16") {
            result.aspectRatioChanges++;
          } else {
            result.unexpectedChanges.push(
              `Level[${i}].alternativeVideos[${j}] unexpected aspectRatio change: ${bAlt.aspectRatio} → ${aAlt.aspectRatio}`,
            );
          }
        }
      }
    }
  }

  return result;
}

function main() {
  const baseRef = getBaseRef();
  console.log(`Base ref: ${baseRef}`);

  // Read before (origin/main) versions
  const candidatesBeforeJson = getGitFile(baseRef, "data/candidates/levels.json");
  const levelsBeforeJson = getGitFile(baseRef, "data/levels/all-levels.json");

  // Read after (current branch) versions
  const candidatesAfterJson = readFileSync(
    join(process.cwd(), "data/candidates/levels.json"),
    "utf-8",
  );
  const levelsAfterJson = readFileSync(
    join(process.cwd(), "data/levels/all-levels.json"),
    "utf-8",
  );

  const candidatesBefore = JSON.parse(candidatesBeforeJson) as Candidate[];
  const candidatesAfter = JSON.parse(candidatesAfterJson) as Candidate[];
  const levelsBefore = JSON.parse(levelsBeforeJson) as Level[];
  const levelsAfter = JSON.parse(levelsAfterJson) as Level[];

  // Compare candidates
  const candidateResult = compareCandidates(candidatesBefore, candidatesAfter);
  console.log(`\nCandidate count before: ${candidateResult.countBefore}`);
  console.log(`Candidate count after: ${candidateResult.countAfter}`);

  // Compare levels
  const levelResult = compareLevels(levelsBefore, levelsAfter);
  console.log(`\nLevel count before: ${levelResult.countBefore}`);
  console.log(`Level count after: ${levelResult.countAfter}`);

  const totalChanges = candidateResult.aspectRatioChanges + levelResult.aspectRatioChanges;
  const totalUnexpected = candidateResult.unexpectedChanges.length + levelResult.unexpectedChanges.length;

  console.log(`\nAspect ratio changes: ${totalChanges}`);
  console.log(`Unexpected semantic changes: ${totalUnexpected}`);

  if (totalUnexpected > 0) {
    console.log("\n--- Unexpected changes ---");
    for (const change of candidateResult.unexpectedChanges) {
      console.log(`  [candidates] ${change}`);
    }
    for (const change of levelResult.unexpectedChanges) {
      console.log(`  [levels] ${change}`);
    }
    console.log("\nFAIL\n");
    process.exit(1);
  }

  console.log("\nPASS\n");
}

main();