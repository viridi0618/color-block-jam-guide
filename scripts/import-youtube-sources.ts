import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

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
};

const projectRoot = resolve(import.meta.dirname, "..");
const readJson = async <T>(path: string): Promise<T> =>
  JSON.parse((await readFile(resolve(projectRoot, path), "utf8")).replace(/^\uFEFF/, "")) as T;
const writeJsonAtomic = async (path: string, value: unknown) => {
  const absolute = resolve(projectRoot, path);
  const tmp = absolute + ".tmp";
  await mkdir(dirname(absolute), { recursive: true });
  await writeFile(tmp, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await writeFile(absolute, `${JSON.stringify(value, null, 2)}\n`, "utf8");
};

// ─── Title Parsing ────────────────────────────────────────────────

// Range pattern: Level A-B (must be checked BEFORE single-level patterns)
const RANGE_PATTERN =
  /\bColor\s*Block\s*Jam\s*[-–—:]?\s*(?:Levels?|Lvls?)\s*#?\s*(\d{1,5})\s*[-–—]\s*(\d{1,5})\b/i;

// Single-level patterns
const LEVEL_PATTERN =
  /\bColor\s*Block\s*Jam\s*[-–—:]?\s*(?:Level|Lvl)\s*#?\s*(\d{1,5})(?:\s*\(\s*(\d{1,5})\s*\))?\b/i;
const PARENTHETICAL_PATTERN =
  /\bColor\s*Block\s*Jam\s*[-–—:]?\s*(?:Level|Lvl)\s*#?\s*(\d{1,5})\s*\(\s*(\d{1,5})\s*\)/i;

interface RangeParseResult {
  type: "range";
  rangeStart: number;
  rangeEnd: number;
  sourceLevelIds: number[];
}

interface SingleParseResult {
  type: "single";
  primaryLevelId: number;
  alternateLevelId: number | null;
  sourceLevelIds: number[];
}

type ParseResult = RangeParseResult | SingleParseResult | null;

export function parseLevelTitle(title: string): ParseResult {
  // 1. Check range format FIRST (Level A-B)
  const rangeMatch = title.match(RANGE_PATTERN);
  if (rangeMatch) {
    const a = Number(rangeMatch[1]);
    const b = Number(rangeMatch[2]);
    // Validate range
    if (a > 0 && b > 0 && b >= a && (b - a + 1) <= 50) {
      const sourceLevelIds: number[] = [];
      for (let i = a; i <= b; i++) sourceLevelIds.push(i);
      return { type: "range", rangeStart: a, rangeEnd: b, sourceLevelIds };
    }
    // Invalid range: fall through to single-number parsing
  }

  // 2. Check single-number formats
  const strict = title.match(LEVEL_PATTERN);
  if (!strict) return null;

  const parenthetical = title.match(PARENTHETICAL_PATTERN);
  const primaryLevelId = Number(strict[1]);
  // Reject level 0
  if (primaryLevelId <= 0) return null;

  const alternateLevelId = parenthetical ? Number(parenthetical[2]) : null;
  return {
    type: "single",
    primaryLevelId,
    alternateLevelId,
    sourceLevelIds: alternateLevelId
      ? [primaryLevelId, alternateLevelId]
      : [primaryLevelId],
  };
}

// ─── Video Ranking ─────────────────────────────────────────────────

const DEMOTION_WORDS = [
  /\bwithout\b/i,
  /\bchallenge\b/i,
  /\bwin\s*streak\b/i,
  /\bno[\s-]?power[\s-]?up\b/i,
  /\bno[\s-]?powerup\b/i,
  /\bspeedrun\b/i,
  /\bhard\s*mode\b/i,
  /\bno[\s-]?booster\b/i,
  /\bno[\s-]?vacuum\b/i,
  /\bspecial\s*challenge\b/i,
];

const STANDARD_TITLE_PATTERNS = [
  /\bLevel\s+\d+\s+Solution\s+Walkthrough\b/i,
  /\bLevel\s+\d+\s+Walkthrough\b/i,
  /\bLevel\s+\d+\s+Solution\b/i,
  /\bLevel\s+\d+\s+Guide\b/i,
  /\bLevels?\s+\d+[\s-]+\d+\s+Solution\s+Walkthrough\b/i,
];

function isDemoted(title: string): boolean {
  return DEMOTION_WORDS.some((pattern) => pattern.test(title));
}

function isStandardTitle(title: string): boolean {
  return STANDARD_TITLE_PATTERNS.some((pattern) => pattern.test(title));
}

function scoreVideo(candidate: Candidate): number {
  let score = 0;

  // 1. Primary-label has highest priority
  if (candidate.matchType === "primary-label") score += 1000;

  // 2. Source priority
  score += candidate.priority;

  // 3. Standard walkthrough title bonus
  if (isStandardTitle(candidate.title)) score += 200;

  // 4. Demotion penalty
  if (isDemoted(candidate.title)) score -= 300;

  // 5. Embeddable and available
  if (candidate.embeddable === false) score -= 10000;
  if (!candidate.videoAvailable) score -= 10000;

  // 6. Published date (newer = higher, null = lowest)
  if (candidate.publishedAt) score += 1;

  return score;
}

function rankCandidates(a: Candidate, b: Candidate): number {
  const scoreDiff = scoreVideo(b) - scoreVideo(a);
  if (scoreDiff !== 0) return scoreDiff;

  // PublishedAt tiebreaker: newer first
  const pubDiff = (b.publishedAt ?? "").localeCompare(a.publishedAt ?? "");
  if (pubDiff !== 0) return pubDiff;

  // Playlist order as final stable tiebreaker
  return 0;
}

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

const mappings: Candidate[] = [];
const unmatched: Array<Record<string, unknown>> = [];
const privateOrDeleted: Array<Record<string, unknown>> = [];
const conflicts: Conflict[] = [];
const rejectedRanges: Array<Record<string, unknown>> = [];
const seenEntries = new Set<string>();
let playlistEntries = 0;
let rangeTitleCount = 0;
let rejectedRangeCount = 0;
let rangeExpansions = 0;

for (const source of enabled) {
  const imported = await readJson<{ entries?: RawEntry[]; videoMetadata?: Record<string, RawEntry> }>(source.importFile);
  playlistEntries += imported.entries?.length ?? 0;
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

    if (parsed.type === "range") {
      rangeTitleCount++;
      const { rangeStart, rangeEnd } = parsed;
      const rangeSize = rangeEnd - rangeStart + 1;

      // Validate range
      if (rangeStart <= 0 || rangeEnd <= 0 || rangeEnd < rangeStart) {
        rejectedRanges.push({
          videoId,
          title,
          rangeStart,
          rangeEnd,
          reason: "Invalid range (negative, zero, or reversed)",
        });
        rejectedRangeCount++;
        continue;
      }
      if (rangeSize > 50) {
        rejectedRanges.push({
          videoId,
          title,
          rangeStart,
          rangeEnd,
          reason: `Range too large (${rangeSize} > 50)`,
        });
        rejectedRangeCount++;
        continue;
      }

      rangeExpansions += rangeSize;

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
          aspectRatio: source.defaultAspectRatio,
          priority: source.priority,
          matchType: "primary-label",
          mappingGroupId: videoId!,
          sourceLevelIds: parsed.sourceLevelIds,
          embeddable,
          videoAvailable,
          rangeStart,
          rangeEnd,
          isRangeVideo: true,
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
          aspectRatio: source.defaultAspectRatio,
          priority: source.priority,
          matchType: index === 0 ? "primary-label" : "parenthetical-label",
          mappingGroupId: videoId!,
          sourceLevelIds: parsed.sourceLevelIds,
          embeddable,
          videoAvailable,
          isRangeVideo: false,
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
    // Sort by ranking
    candidates.sort(rankCandidates);

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

// Check for missing structured data fields
for (const level of levels) {
  if (!level.primaryVideo) continue;
  const pv = level.primaryVideo;
  if (!pv.title) {
    conflicts.push({
      type: "missing_video_title",
      severity: "error",
      levelId: level.levelId,
      videoId: pv.videoId,
      reason: `Level ${level.levelId} primary video has no title`,
    });
  }
  if (!pv.thumbnailUrl) {
    conflicts.push({
      type: "missing_thumbnail",
      severity: "warning",
      levelId: level.levelId,
      videoId: pv.videoId,
      reason: `Level ${level.levelId} primary video has no thumbnail`,
    });
  }
  if (!pv.publishedAt) {
    conflicts.push({
      type: "missing_published_at",
      severity: "warning",
      levelId: level.levelId,
      videoId: pv.videoId,
      reason: `Level ${level.levelId} primary video has no publishedAt`,
    });
  }
  if (pv.durationSeconds == null) {
    conflicts.push({
      type: "missing_duration",
      severity: "warning",
      levelId: level.levelId,
      videoId: pv.videoId,
      reason: `Level ${level.levelId} primary video has no duration`,
    });
  }
}

// ─── Write output ──────────────────────────────────────────────────

// Write to tmp first, then rename for atomicity
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

const uniqueVideos = new Set(mappings.map((mapping) => mapping.videoId));
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

console.log(`Playlist entries: ${playlistEntries}`);
console.log(`Unique video IDs (seen): ${seenEntries.size}`);
console.log(`Valid video IDs (mapped): ${uniqueVideos.size}`);
console.log(`Single-number titles: ${uniqueVideos.size - dualVideos.size - rangeVideos.size}`);
console.log(`Dual-number titles: ${dualVideos.size}`);
console.log(`Range titles: ${rangeTitleCount}`);
console.log(`Range expansions: ${rangeExpansions}`);
console.log(`Rejected ranges: ${rejectedRangeCount}`);
console.log(`Unique mapped level IDs: ${levels.length}`);
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