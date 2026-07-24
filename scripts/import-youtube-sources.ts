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
  timestamp?: number;
  playlist_index?: number;
  availability?: string;
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
};

const projectRoot = resolve(import.meta.dirname, "..");
const readJson = async <T>(path: string): Promise<T> =>
  JSON.parse((await readFile(resolve(projectRoot, path), "utf8")).replace(/^\uFEFF/, "")) as T;
const writeJson = async (path: string, value: unknown) => {
  const absolute = resolve(projectRoot, path);
  await mkdir(dirname(absolute), { recursive: true });
  await writeFile(absolute, `${JSON.stringify(value, null, 2)}\n`, "utf8");
};

const LEVEL_PATTERN =
  /\bColor\s*Block\s*Jam\s*[-–—:]?\s*(?:Level|Lvl)\s*#?\s*(\d{1,5})(?:\s*\(\s*(\d{1,5})\s*\))?\b/i;
const PARENTHETICAL_PATTERN =
  /\bColor\s*Block\s*Jam\s*[-–—:]?\s*(?:Level|Lvl)\s*#?\s*(\d{1,5})\s*\(\s*(\d{1,5})\s*\)/i;

export function parseLevelTitle(title: string) {
  const strict = title.match(LEVEL_PATTERN);
  if (!strict) return null;
  const parenthetical = title.match(PARENTHETICAL_PATTERN);
  const primaryLevelId = Number(strict[1]);
  const alternateLevelId = parenthetical ? Number(parenthetical[2]) : null;
  return {
    primaryLevelId,
    alternateLevelId,
    sourceLevelIds: alternateLevelId
      ? [primaryLevelId, alternateLevelId]
      : [primaryLevelId],
  };
}

const isoDate = (timestamp?: number) =>
  timestamp ? new Date(timestamp * 1000).toISOString() : null;

const { sources } = await readJson<{ sources: Source[] }>(
  "data/sources/youtube-sources.json",
);
const enabled = sources.filter(
  (source) => source.enabled && source.qualityStatus !== "blocked",
);
const mappings: Candidate[] = [];
const unmatched: Array<Record<string, unknown>> = [];
const privateOrDeleted: Array<Record<string, unknown>> = [];
const seenEntries = new Set<string>();
let playlistEntries = 0;

for (const source of enabled) {
  const imported = await readJson<{ entries?: RawEntry[] }>(source.importFile);
  playlistEntries += imported.entries?.length ?? 0;
  for (const entry of imported.entries ?? []) {
    const title = entry.title?.trim() ?? "";
    if (
      !entry.id ||
      !/^[A-Za-z0-9_-]{11}$/.test(entry.id) ||
      /private|deleted/i.test(title) ||
      entry.availability === "private"
    ) {
      privateOrDeleted.push({
        sourceId: source.sourceId,
        videoId: entry.id ?? null,
        title,
      });
      continue;
    }
    if (seenEntries.has(`${source.sourceId}:${entry.id}`)) continue;
    seenEntries.add(`${source.sourceId}:${entry.id}`);
    const parsed = parseLevelTitle(title);
    if (!parsed) {
      unmatched.push({
        sourceId: source.sourceId,
        videoId: entry.id,
        title,
        reason: "No exact Color Block Jam Level N title match",
      });
      continue;
    }
    parsed.sourceLevelIds.forEach((levelId, index) => {
      mappings.push({
        levelId,
        videoId: entry.id!,
        sourceId: source.sourceId,
        title,
        channelTitle: entry.channel ?? entry.uploader ?? source.channelName,
        durationSeconds: entry.duration ?? null,
        publishedAt: isoDate(entry.timestamp),
        thumbnailUrl: `https://i.ytimg.com/vi/${entry.id}/hqdefault.jpg`,
        aspectRatio: source.defaultAspectRatio,
        priority: source.priority,
        matchType: index === 0 ? "primary-label" : "parenthetical-label",
        mappingGroupId: entry.id!,
        sourceLevelIds: parsed.sourceLevelIds,
      });
    });
  }
}

const byLevel = new Map<number, Candidate[]>();
for (const mapping of mappings) {
  const values = byLevel.get(mapping.levelId) ?? [];
  if (!values.some((value) => value.videoId === mapping.videoId)) values.push(mapping);
  byLevel.set(mapping.levelId, values);
}

const multipleCandidates: Array<Record<string, unknown>> = [];
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
});
const rank = (a: Candidate, b: Candidate) =>
  (a.matchType === "primary-label" ? -1 : 1) -
    (b.matchType === "primary-label" ? -1 : 1) ||
  b.priority - a.priority ||
  (b.publishedAt ?? "").localeCompare(a.publishedAt ?? "") ||
  b.title.length - a.title.length;

const levels = Array.from(byLevel.entries())
  .sort(([a], [b]) => a - b)
  .map(([levelId, candidates]) => {
    candidates.sort(rank);
    if (candidates.length > 1) {
      multipleCandidates.push({
        levelId,
        videoIds: candidates.map((candidate) => candidate.videoId),
      });
    }
    const [primary, alternative] = candidates;
    return {
      levelId,
      slug: `/level/${levelId}`,
      status: "approved" as const,
      matchType: primary.matchType,
      sourceLevelIds: primary.sourceLevelIds,
      primaryVideo: publicVideo(primary),
      alternativeVideos: alternative ? [publicVideo(alternative)] : [],
    };
  });

await Promise.all([
  writeJson("data/candidates/levels.json", mappings),
  writeJson("data/levels/all-levels.json", levels),
  writeJson("data/review/unmatched-videos.json", unmatched),
  writeJson("data/review/conflicts.json", []),
  writeJson("data/review/multiple-candidates.json", multipleCandidates),
  writeJson("data/review/private-deleted-videos.json", privateOrDeleted),
]);

const uniqueVideos = new Set(mappings.map((mapping) => mapping.videoId));
const dualVideos = new Set(
  mappings
    .filter((mapping) => mapping.sourceLevelIds.length === 2)
    .map((mapping) => mapping.videoId),
);
console.log(`Playlist entries: ${playlistEntries}`);
console.log(`Unique video IDs: ${seenEntries.size}`);
console.log(`Valid video IDs: ${uniqueVideos.size}`);
console.log(`Single-number titles: ${uniqueVideos.size - dualVideos.size}`);
console.log(`Dual-number titles: ${dualVideos.size}`);
console.log(`Unique mapped level IDs: ${levels.length}`);
console.log(`Duplicate level candidates: ${multipleCandidates.length}`);
console.log(`Unmatched titles: ${unmatched.length}`);
console.log(`Private/deleted entries: ${privateOrDeleted.length}`);
console.log(`First mapped level: ${levels[0]?.levelId ?? "none"}`);
console.log(`Last mapped level: ${levels.at(-1)?.levelId ?? "none"}`);
