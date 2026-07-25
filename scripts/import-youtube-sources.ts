import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import {
  parseLevelTitle,
  rankCandidates,
} from "../lib/level-parser.ts";
import type { Rankable } from "../lib/level-parser.ts";

type AspectRatio = "16:9" | "9:16" | "4:3";
type MatchType = "primary-label" | "parenthetical-label";
type Source = {
  sourceId: string;
  playlistId: string;
  channelName: string;
  priority: number;
  qualityStatus: "preferred" | "fallback" | "blocked";
  defaultAspectRatio: AspectRatio;
  enabled: boolean;
  importFile: string;
};
type RawEntry = {
  id?: string;
  title?: string;
  channel?: string;
  uploader?: string;
  duration?: number;
  durationSeconds?: number;
  timestamp?: number;
  publishedAt?: string;
  playlist_index?: number;
  availability?: string;
  embeddable?: boolean;
};
type Conflict = {
  type: string;
  severity: "error" | "warning";
  videoId?: string;
  title?: string;
  levelId?: number;
  levelIds?: number[];
  expected?: unknown;
  actual?: unknown;
  reason: string;
  sourcePlaylist?: string;
  playlistPosition?: number;
};
type Candidate = {
  levelId: number;
  videoId: string;
  sourceId: string;
  title: string;
  channelTitle: string;
  durationSeconds: number | null;
  publishedAt: string | null;
  thumbnailUrl: string;
  aspectRatio: AspectRatio;
  priority: number;
  matchType: MatchType;
  mappingGroupId: string;
  sourceLevelIds: number[];
  embeddable: boolean | null;
  videoAvailable: boolean;
  rangeStart?: number;
  rangeEnd?: number;
  isRangeVideo: boolean;
  playlistPosition?: number;
};

const projectRoot = resolve(import.meta.dirname, "..");
const readJson = async <T>(path: string): Promise<T> =>
  JSON.parse((await readFile(resolve(projectRoot, path), "utf8")).replace(/^\uFEFF/, "")) as T;

/**
 * Atomic write: write to tmp file, then rename over final file.
 * If rename fails, the old file is preserved.
 * Cleans up stale tmp files on success.
 */
const writeJsonAtomic = async (path: string, value: unknown) => {
  const absolute = resolve(projectRoot, path);
  const tmp = absolute + ".tmp";
  await mkdir(dirname(absolute), { recursive: true });
  await writeFile(tmp, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(tmp, absolute);
  // Cleanup stale tmp in case of previous crash
  try { await unlink(tmp); } catch { /* already renamed */ }
};

const isoDate = (timestamp?: number) =>
  timestamp ? new Date(timestamp * 1000).toISOString() : null;

// ─── Main Import Logic ─────────────────────────────────────────────

const { sources } = await readJson<{ sources: Source[] }>(
  "data/sources/youtube-sources.json",
);
const enabled = sources.filter(
  (source) => source.enabled && source.qualityStatus !== "blocked",
);

const overrides = await readJson<Record<string, { primaryVideoId?: string }>>(
  "data/overrides/video-selection.json",
).catch(() => ({} as Record<string, { primaryVideoId?: string }>));

const aspectRatioOverrides = await readJson<Record<string, AspectRatio>>(
  "data/overrides/video-aspect-ratio.json",
).catch(() => ({} as Record<string, AspectRatio>));

const mappings: Candidate[] = [];
const unmatched: Array<Record<string, unknown>> = [];
const privateOrDeleted: Array<Record<string, unknown>> = [];
const conflicts: Conflict[] = [];
const rejectedRanges: Array<Record<string, unknown>> = [];
const seenEntries = new Set<string>();
let rawPlaylistEntries = 0;
let rangeTitleCount = 0;
let rejectedRangeCount = 0;
let rangeExpansions = 0;

// Validate aspect ratio override values
const VALID_ASPECT_RATIOS = new Set<string>(["16:9", "9:16", "4:3"]);
for (const [videoId, ratio] of Object.entries(aspectRatioOverrides)) {
  if (!VALID_ASPECT_RATIOS.has(ratio)) {
    conflicts.push({
      type: "invalid_aspect_ratio_override",
      severity: "error",
      videoId,
      reason: `Invalid aspect ratio "${ratio}" for video ${videoId}. Must be one of: 16:9, 9:16, 4:3`,
    });
  }
}

for (const source of enabled) {
  const imported = await readJson<{ entries?: RawEntry[]; videoMetadata?: Record<string, RawEntry> }>(source.importFile);
  rawPlaylistEntries += imported.entries?.length ?? 0;
  const videoMeta = imported.videoMetadata ?? {};

  for (const entry of imported.entries ?? []) {
    const title = entry.title?.trim() ?? "";
    const videoId = entry.id;

    // Check for private/deleted
    if (
      !videoId ||
      !/^[A-Za-z0-9_-]{11}$/.test(videoId) ||
      /private|deleted/i.test(title) ||
      entry.availability === "private"
    ) {
      privateOrDeleted.push({
        sourceId: source.sourceId,
        videoId: videoId ?? null,
        title,
      });
      continue;
    }

    if (seenEntries.has(`${source.sourceId}:${videoId}`)) continue;
    seenEntries.add(`${source.sourceId}:${videoId}`);

    // Merge videos.list metadata
    const meta = videoMeta[videoId];
    const durationSeconds = meta?.durationSeconds ?? entry.durationSeconds ?? entry.duration ?? null;
    const publishedAt = meta?.publishedAt ?? isoDate(entry.timestamp);
    const embeddable = meta?.embeddable ?? null;
    const videoAvailable = meta?.availability
      ? meta.availability !== "private" && meta.availability !== "unlisted"
      : entry.availability
        ? entry.availability !== "private"
        : true;
    const playlistPosition = entry.playlist_index ?? undefined;

    const parsed = parseLevelTitle(title);

    if (!parsed) {
      unmatched.push({
        sourceId: source.sourceId,
        videoId,
        title,
        reason: "No exact Color Block Jam Level N title match",
      });
      continue;
    }

    if (parsed.type === "rejected-range") {
      rejectedRanges.push({
        videoId,
        title,
        rangeStart: parsed.rangeStart,
        rangeEnd: parsed.rangeEnd,
        reason: parsed.reason,
      });
      rejectedRangeCount++;
      continue;
    }

    if (parsed.type === "range") {
      rangeTitleCount++;
      const { rangeStart, rangeEnd } = parsed;
      rangeExpansions += (rangeEnd - rangeStart + 1);

      for (let i = rangeStart; i <= rangeEnd; i++) {
        mappings.push({
          levelId: i,
          videoId: videoId!,
          sourceId: source.sourceId,
          title,
          channelTitle: entry.channel ?? entry.uploader ?? source.channelName,
          durationSeconds,
          publishedAt,
          thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
          aspectRatio: aspectRatioOverrides[videoId!] ?? source.defaultAspectRatio,
          priority: source.priority,
          matchType: "primary-label",
          mappingGroupId: videoId!,
          sourceLevelIds: parsed.sourceLevelIds,
          embeddable,
          videoAvailable,
          rangeStart,
          rangeEnd,
          isRangeVideo: true,
          playlistPosition,
        });
      }
    } else {
      // Single-level parsing
      parsed.sourceLevelIds.forEach((levelId, index) => {
        mappings.push({
          levelId,
          videoId: videoId!,
          sourceId: source.sourceId,
          title,
          channelTitle: entry.channel ?? entry.uploader ?? source.channelName,
          durationSeconds,
          publishedAt,
          thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
          aspectRatio: aspectRatioOverrides[videoId!] ?? source.defaultAspectRatio,
          priority: source.priority,
          matchType: index === 0 ? "primary-label" : "parenthetical-label",
          mappingGroupId: videoId!,
          sourceLevelIds: parsed.sourceLevelIds,
          embeddable,
          videoAvailable,
          isRangeVideo: false,
          playlistPosition,
        });
      });
    }
  }
}

// ─── Group candidates by level ─────────────────────────────────────

const byLevel = new Map<number, Candidate[]>();
for (const mapping of mappings) {
  const values = byLevel.get(mapping.levelId) ?? [];
  if (!values.some((value) => value.videoId === mapping.videoId)) values.push(mapping);
  byLevel.set(mapping.levelId, values);
}

// ─── Build levels with conflicts ───────────────────────────────────

const multipleCandidates: Array<Record<string, unknown>> = [];
const missingLevels: number[] = [];

const publicVideo = (candidate: Candidate) => ({
  videoId: candidate.videoId,
  sourceId: candidate.sourceId,
  title: candidate.title,
  channelTitle: candidate.channelTitle,
  durationSeconds: candidate.durationSeconds,
  publishedAt: candidate.publishedAt,
  thumbnailUrl: candidate.thumbnailUrl,
  aspectRatio: candidate.aspectRatio,
  matchType: candidate.matchType,
  mappingGroupId: candidate.mappingGroupId,
  sourceLevelIds: candidate.sourceLevelIds,
  ...(candidate.isRangeVideo ? { rangeStart: candidate.rangeStart, rangeEnd: candidate.rangeEnd } : {}),
});

const levels = Array.from(byLevel.entries())
  .sort(([a], [b]) => a - b)
  .map(([levelId, candidates]) => {
    // Sort by ranking using the extracted rankCandidates
    const rankable: Rankable[] = candidates.map((c) => ({
      matchType: c.matchType,
      priority: c.priority,
      title: c.title,
      embeddable: c.embeddable,
      videoAvailable: c.videoAvailable,
      publishedAt: c.publishedAt,
      playlistPosition: c.playlistPosition,
      videoId: c.videoId,
    }));
    candidates.sort((a, b) => {
      const ra = rankable.find((r) => r.videoId === a.videoId)!;
      const rb = rankable.find((r) => r.videoId === b.videoId)!;
      return rankCandidates(ra, rb);
    });

    // Filter out unembeddable and unavailable videos
    const usable = candidates.filter(
      (c) => c.embeddable !== false && c.videoAvailable,
    );
    const alternatives = usable.slice(1);

    // Use overrides if present
    const override = overrides[String(levelId)];
    let primary = usable[0];
    if (override?.primaryVideoId) {
      const overrideVideo = candidates.find(
        (c) => c.videoId === override.primaryVideoId,
      );
      if (overrideVideo && overrideVideo.embeddable !== false && overrideVideo.videoAvailable) {
        primary = overrideVideo;
      } else {
        conflicts.push({
          type: "override_not_usable",
          severity: "warning",
          videoId: override.primaryVideoId,
          levelId,
          reason: `Override video ${override.primaryVideoId} for level ${levelId} is not usable`,
        });
      }
    }

    if (candidates.length > 1) {
      multipleCandidates.push({
        levelId,
        videoIds: candidates.map((candidate) => candidate.videoId),
      });
    }

    // Check for conflicts
    if (!primary) {
      conflicts.push({
        type: "no_usable_video",
        severity: "error",
        levelId,
        reason: `Level ${levelId} has no usable (embeddable + available) video`,
      });
    }

    // Check if primary video is not embeddable
    if (primary && primary.embeddable === false) {
      conflicts.push({
        type: "primary_not_embeddable",
        severity: "error",
        videoId: primary.videoId,
        title: primary.title,
        levelId,
        reason: `Primary video for level ${levelId} is not embeddable`,
        sourcePlaylist: primary.sourceId,
      });
    }

    // Check if primary video is unavailable
    if (primary && !primary.videoAvailable) {
      conflicts.push({
        type: "primary_unavailable",
        severity: "error",
        videoId: primary.videoId,
        title: primary.title,
        levelId,
        reason: `Primary video for level ${levelId} is unavailable`,
        sourcePlaylist: primary.sourceId,
      });
    }

    // Check for duplicate primary in alternatives
    if (primary && alternatives.some((a) => a.videoId === primary.videoId)) {
      conflicts.push({
        type: "primary_in_alternatives",
        severity: "warning",
        videoId: primary.videoId,
        levelId,
        reason: `Primary video also appears in alternatives for level ${levelId}`,
      });
    }

    // Check sourceLevelIds consistency
    if (primary && !primary.sourceLevelIds.includes(levelId)) {
      conflicts.push({
        type: "level_not_in_source_ids",
        severity: "error",
        videoId: primary.videoId,
        levelId,
        actual: primary.sourceLevelIds,
        reason: `Level ${levelId} not in primary video sourceLevelIds`,
      });
    }

    // Check for range video mapping outside declared range
    if (primary?.isRangeVideo && primary.rangeStart != null && primary.rangeEnd != null) {
      if (levelId < primary.rangeStart || levelId > primary.rangeEnd) {
        conflicts.push({
          type: "range_video_out_of_bounds",
          severity: "error",
          videoId: primary.videoId,
          levelId,
          reason: `Level ${levelId} outside range video ${primary.videoId} declared range ${primary.rangeStart}-${primary.rangeEnd}`,
        });
      }
    }

    return {
      levelId,
      slug: `/level/${levelId}`,
      status: primary ? ("approved" as const) : ("candidate" as const),
      matchType: primary?.matchType ?? "primary-label",
      sourceLevelIds: primary?.sourceLevelIds ?? [levelId],
      primaryVideo: primary ? publicVideo(primary) : null,
      alternativeVideos: alternatives.map(publicVideo),
      ...(primary?.isRangeVideo ? {
        isRangeVideo: true,
        rangeStart: primary.rangeStart,
        rangeEnd: primary.rangeEnd,
      } : {}),
    };
  });

// Check for duplicate levelIds
const seenLevelIds = new Set<number>();
for (const level of levels) {
  if (seenLevelIds.has(level.levelId)) {
    conflicts.push({
      type: "duplicate_level_id",
      severity: "error",
      levelId: level.levelId,
      reason: `Duplicate levelId ${level.levelId}`,
    });
  }
  seenLevelIds.add(level.levelId);
}

// Check for duplicate slugs
const seenSlugs = new Map<string, number>();
for (const level of levels) {
  const existing = seenSlugs.get(level.slug);
  if (existing != null) {
    conflicts.push({
      type: "duplicate_slug",
      severity: "error",
      levelId: level.levelId,
      reason: `Duplicate slug "${level.slug}" for levels ${existing} and ${level.levelId}`,
    });
  }
  seenSlugs.set(level.slug, level.levelId);
}

// ─── Write output ──────────────────────────────────────────────────

await Promise.all([
  writeJsonAtomic("data/candidates/levels.json", mappings),
  writeJsonAtomic("data/levels/all-levels.json", levels.filter((l) => l.primaryVideo != null)),
  writeJsonAtomic("data/review/unmatched-videos.json", unmatched),
  writeJsonAtomic("data/review/conflicts.json", conflicts),
  writeJsonAtomic("data/review/multiple-candidates.json", multipleCandidates),
  writeJsonAtomic("data/review/private-deleted-videos.json", privateOrDeleted),
  writeJsonAtomic("data/review/missing-levels.json", missingLevels),
  writeJsonAtomic("data/review/rejected-ranges.json", rejectedRanges),
]);

// ─── Summary ────────────────────────────────────────────────────────

const uniqueVideoIds = new Set(mappings.map((mapping) => mapping.videoId));
const dualVideos = new Set(
  mappings
    .filter((mapping) => mapping.sourceLevelIds.length === 2)
    .map((mapping) => mapping.videoId),
);
const errorConflicts = conflicts.filter((c) => c.severity === "error");
const warningConflicts = conflicts.filter((c) => c.severity === "warning");
const approvedLevels = levels.filter((l) => l.status === "approved");
const rangeVideos = new Set(
  mappings.filter((m) => m.isRangeVideo).map((m) => m.videoId),
);

console.log(`Raw playlist entries: ${rawPlaylistEntries}`);
console.log(`Unique video IDs (seen): ${seenEntries.size}`);
console.log(`Valid video IDs (mapped): ${uniqueVideoIds.size}`);
console.log(`Candidate mappings: ${mappings.length}`);
console.log(`Single-number titles: ${uniqueVideoIds.size - dualVideos.size - rangeVideos.size}`);
console.log(`Dual-number titles: ${dualVideos.size}`);
console.log(`Range titles: ${rangeTitleCount}`);
console.log(`Range expansions: ${rangeExpansions}`);
console.log(`Rejected ranges: ${rejectedRangeCount}`);
console.log(`Approved level pages: ${approvedLevels.length}`);
console.log(`Duplicate level candidates: ${multipleCandidates.length}`);
console.log(`Unmatched titles: ${unmatched.length}`);
console.log(`Private/deleted entries: ${privateOrDeleted.length}`);
console.log(`Conflicts (errors): ${errorConflicts.length}`);
console.log(`Conflicts (warnings): ${warningConflicts.length}`);
console.log(`First mapped level: ${levels[0]?.levelId ?? "none"}`);
console.log(`Last mapped level: ${levels.at(-1)?.levelId ?? "none"}`);

// Exit with error if there are error-level conflicts
if (errorConflicts.length > 0) {
  console.error(`\n${errorConflicts.length} error-level conflicts found:`);
  for (const c of errorConflicts) {
    console.error(`  [${c.type}] ${c.reason}`);
  }
  process.exit(1);
}