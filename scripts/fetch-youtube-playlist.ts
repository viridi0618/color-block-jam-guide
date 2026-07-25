import { readFile, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const playlistId = "PLEOnLO5L7cCcB4czXa_vNF0qCjik7RUpK";
const playlistUrl = `https://www.youtube.com/playlist?list=${playlistId}`;
const output = resolve(root, "data/import/cheriegaming-main.json");

function run(command: string, args: string[]) {
  return new Promise<string>((resolveOutput, reject) => {
    const child = spawn(command, args, { windowsHide: true });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => (stdout += chunk));
    child.stderr.on("data", (chunk) => (stderr += chunk));
    child.on("error", reject);
    child.on("close", (code) =>
      code === 0
        ? resolveOutput(stdout)
        : reject(new Error(stderr || `${command} exited with ${code}`)),
    );
  });
}

interface VideoMetadata {
  durationSeconds: number | null;
  publishedAt: string | null;
  embeddable: boolean | null;
  availability: string | null;
}

/** Parse ISO 8601 duration to seconds */
function parseDuration(iso: string): number | null {
  const match = iso.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!match) return null;
  const hours = parseInt(match[1] ?? "0", 10);
  const minutes = parseInt(match[2] ?? "0", 10);
  const seconds = parseInt(match[3] ?? "0", 10);
  return hours * 3600 + minutes * 60 + seconds;
}

/** Fetch video metadata via YouTube Data API videos.list */
async function fetchVideoMetadata(apiKey: string, videoIds: string[]): Promise<Record<string, VideoMetadata>> {
  const metadata: Record<string, VideoMetadata> = {};
  const uniqueIds = [...new Set(videoIds)];
  const batchSize = 50;
  const batches: string[][] = [];
  for (let i = 0; i < uniqueIds.length; i += batchSize) {
    batches.push(uniqueIds.slice(i, i + batchSize));
  }
  console.log(`Fetching video metadata in ${batches.length} batches of up to ${batchSize} video IDs...`);

  let fetchedCount = 0;
  let missingCount = 0;

  for (const batch of batches) {
    const url = new URL("https://www.googleapis.com/youtube/v3/videos");
    url.searchParams.set("part", "contentDetails,status,snippet");
    url.searchParams.set("id", batch.join(","));
    url.searchParams.set("key", apiKey);
    url.searchParams.set("maxResults", "50");

    try {
      const response = await fetch(url);
      if (!response.ok) {
        console.error(`videos.list failed for batch: ${response.status}`);
        continue;
      }
      const page = (await response.json()) as {
        items?: Array<{
          id: string;
          contentDetails?: { duration?: string };
          status?: { embeddable?: boolean; privacyStatus?: string };
          snippet?: { publishedAt?: string };
        }>;
      };
      const returnedIds = new Set<string>();
      for (const item of page.items ?? []) {
        returnedIds.add(item.id);
        metadata[item.id] = {
          durationSeconds: item.contentDetails?.duration
            ? parseDuration(item.contentDetails.duration)
            : null,
          publishedAt: item.snippet?.publishedAt ?? null,
          embeddable: item.status?.embeddable ?? null,
          availability: item.status?.privacyStatus ?? null,
        };
        fetchedCount++;
      }

      // Log missing video IDs
      for (const vid of batch) {
        if (!returnedIds.has(vid)) {
          console.warn(`  Missing metadata for video: ${vid}`);
          missingCount++;
        }
      }
    } catch (error) {
      console.error(`videos.list batch failed: ${error}`);
    }
  }

  console.log(`Fetched metadata for ${fetchedCount} videos, ${missingCount} missing`);
  return metadata;
}

async function fetchWithApi(apiKey: string) {
  const entries: Array<Record<string, unknown>> = [];
  let pageToken = "";
  do {
    const url = new URL("https://www.googleapis.com/youtube/v3/playlistItems");
    url.searchParams.set("part", "snippet,status");
    url.searchParams.set("maxResults", "50");
    url.searchParams.set("playlistId", playlistId);
    url.searchParams.set("key", apiKey);
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const response = await fetch(url);
    if (!response.ok) throw new Error(`YouTube API returned ${response.status}`);
    const page = (await response.json()) as {
      nextPageToken?: string;
      items?: Array<{
        snippet?: {
          title?: string;
          channelTitle?: string;
          position?: number;
          resourceId?: { videoId?: string };
        };
        status?: { privacyStatus?: string };
      }>;
    };
    for (const item of page.items ?? []) {
      entries.push({
        id: item.snippet?.resourceId?.videoId,
        title: item.snippet?.title,
        channel: item.snippet?.channelTitle,
        playlist_index: item.snippet?.position,
        availability: item.status?.privacyStatus,
      });
    }
    pageToken = page.nextPageToken ?? "";
  } while (pageToken);

  // Collect all video IDs and fetch metadata
  const videoIds = entries
    .map((e) => e.id as string)
    .filter((id): id is string => !!id && /^[A-Za-z0-9_-]{11}$/.test(id));
  const videoMetadata = await fetchVideoMetadata(apiKey, videoIds);

  return { id: playlistId, title: "Color Block Jam", entries, videoMetadata };
}

async function fetchWithYtDlp() {
  const commands: Array<[string, string[]]> =
    process.platform === "win32"
      ? [["python", ["-m", "yt_dlp"]]]
      : [["yt-dlp", []], ["python3", ["-m", "yt_dlp"]]];
  let lastError: unknown;
  for (const [command, prefix] of commands) {
    try {
      const raw = await run(command, [
        ...prefix,
        "--flat-playlist",
        "--skip-download",
        "--ignore-errors",
        "--dump-single-json",
        playlistUrl,
      ]);
      return JSON.parse(raw) as { entries?: unknown[] };
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

let payload: { entries?: unknown[]; videoMetadata?: Record<string, VideoMetadata> };
try {
  payload = process.env.YOUTUBE_API_KEY
    ? await fetchWithApi(process.env.YOUTUBE_API_KEY)
    : await fetchWithYtDlp();
  await writeFile(output, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(`Fetched playlist entries: ${payload.entries?.length ?? 0}`);
  if (payload.videoMetadata) {
    console.log(`Video metadata records: ${Object.keys(payload.videoMetadata).length}`);
  }
} catch (error) {
  const cached = JSON.parse(await readFile(output, "utf8")) as {
    entries?: unknown[];
  };
  if (!cached.entries?.length) throw error;
  console.warn("Live fetch was unavailable; using the existing complete metadata snapshot.");
  console.log(`Cached playlist entries: ${cached.entries.length}`);
}