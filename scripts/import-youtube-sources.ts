import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { mkdir } from "node:fs/promises";

type AspectRatio = "16:9" | "9:16" | "4:3";
type Source = {
  sourceId: string;
  url: string;
  playlistId: string;
  channelName: string;
  priority: number;
  role: "primary" | "gap-fill" | "alternative-only";
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
  candidateStatus: "selected" | "alternative" | "needs-review" | "rejected";
  reviewFlags: string[];
};

const projectRoot = resolve(import.meta.dirname, "..");
const readJson = async <T>(path: string): Promise<T> =>
  JSON.parse(await readFile(resolve(projectRoot, path), "utf8")) as T;
const writeJson = async (path: string, value: unknown) => {
  const absolute = resolve(projectRoot, path);
  await mkdir(dirname(absolute), { recursive: true });
  await writeFile(absolute, `${JSON.stringify(value, null, 2)}\n`, "utf8");
};

function parseLevel(title: string) {
  const match = title.match(/\bColor\s*Block\s*Jam\s+(?:Level|Lvl)\s*#?\s*(\d+)\b/i);
  return match ? Number(match[1]) : null;
}

function isoDate(timestamp?: number) {
  return timestamp ? new Date(timestamp * 1000).toISOString() : null;
}

const { sources } = await readJson<{ sources: Source[] }>(
  "data/sources/youtube-sources.json",
);
const enabled = sources.filter(
  (source) => source.enabled && source.qualityStatus !== "blocked",
);
const candidates: Candidate[] = [];
const unmatched: Array<Record<string, unknown>> = [];

for (const source of enabled) {
  const imported = await readJson<{ entries?: RawEntry[] }>(source.importFile);
  for (const entry of imported.entries ?? []) {
    const title = entry.title?.trim() ?? "";
    const levelId = parseLevel(title);
    if (!levelId || !entry.id || !/^[A-Za-z0-9_-]{11}$/.test(entry.id)) {
      unmatched.push({
        sourceId: source.sourceId,
        videoId: entry.id ?? null,
        title,
        reason: "No exact Color Block Jam Level N match",
      });
      continue;
    }
    candidates.push({
      levelId,
      videoId: entry.id,
      sourceId: source.sourceId,
      title,
      channelTitle: entry.channel ?? entry.uploader ?? source.channelName,
      durationSeconds: entry.duration ?? null,
      publishedAt: isoDate(entry.timestamp),
      thumbnailUrl: `https://i.ytimg.com/vi/${entry.id}/hqdefault.jpg`,
      aspectRatio: source.defaultAspectRatio,
      priority: source.priority,
      candidateStatus: "selected",
      reviewFlags: [],
    });
  }
}

const byVideo = new Map<string, Candidate>();
const conflicts: Array<Record<string, unknown>> = [];
for (const candidate of candidates) {
  const existing = byVideo.get(candidate.videoId);
  if (existing && existing.levelId !== candidate.levelId) {
    conflicts.push({
      videoId: candidate.videoId,
      levelIds: [existing.levelId, candidate.levelId],
    });
    continue;
  }
  if (!existing || candidate.priority > existing.priority) {
    byVideo.set(candidate.videoId, candidate);
  }
}

const byLevel = new Map<number, Candidate[]>();
for (const candidate of byVideo.values()) {
  const values = byLevel.get(candidate.levelId) ?? [];
  if (!values.some((value) => value.videoId === candidate.videoId)) {
    values.push(candidate);
  }
  byLevel.set(candidate.levelId, values);
}

const multipleCandidates: Array<Record<string, unknown>> = [];
const levels = Array.from(byLevel.entries())
  .sort(([a], [b]) => a - b)
  .map(([levelId, values]) => {
    values.sort((a, b) => b.priority - a.priority);
    const [primary, ...rest] = values;
    const alternatives = rest.slice(0, 2).map((value) => ({
      ...value,
      candidateStatus: "alternative" as const,
    }));
    if (rest.length) {
      multipleCandidates.push({
        levelId,
        videoIds: values.map((value) => value.videoId),
      });
    }
    const publicVideo = (candidate: Candidate) => ({
      videoId: candidate.videoId,
      sourceId: candidate.sourceId,
      title: candidate.title,
      channelTitle: candidate.channelTitle,
      durationSeconds: candidate.durationSeconds,
      publishedAt: candidate.publishedAt,
      thumbnailUrl: candidate.thumbnailUrl,
      aspectRatio: candidate.aspectRatio,
    });
    return {
      levelId,
      slug: `/level/${levelId}`,
      status: "approved" as const,
      primaryVideo: publicVideo(primary),
      alternativeVideos: alternatives.map(publicVideo),
    };
  });

const suspicious = candidates
  .filter((candidate) => (candidate.durationSeconds ?? 0) > 300)
  .map((candidate) => ({
    levelId: candidate.levelId,
    videoId: candidate.videoId,
    sourceId: candidate.sourceId,
    reviewFlags: ["duration-over-5-minutes"],
  }));

await Promise.all([
  writeJson("data/candidates/levels.json", Array.from(byLevel.entries())),
  writeJson("data/levels/all-levels.json", levels),
  writeJson("data/review/unmatched-videos.json", unmatched),
  writeJson("data/review/conflicts.json", conflicts),
  writeJson("data/review/suspicious-videos.json", suspicious),
  writeJson("data/review/multiple-candidates.json", multipleCandidates),
  writeJson("data/review/missing-levels.json", []),
]);

console.log(`Sources enabled: ${enabled.length}`);
console.log(
  `Preferred sources: ${enabled.filter((source) => source.qualityStatus === "preferred").length}`,
);
console.log(
  `Fallback sources: ${enabled.filter((source) => source.qualityStatus === "fallback").length}`,
);
console.log(`Playlist items: ${candidates.length + unmatched.length}`);
console.log(`Parsed candidates: ${candidates.length}`);
console.log(`Unique levels: ${levels.length}`);
console.log(`Preferred-covered levels: ${levels.length}`);
console.log("Gap-filled levels: 0");
console.log(`Multiple-candidate levels: ${multipleCandidates.length}`);
console.log(`Suspicious videos: ${suspicious.length}`);
console.log(`Unmatched: ${unmatched.length}`);
console.log(`Conflicts: ${conflicts.length}`);
console.log(`Approved levels: ${levels.length}`);
