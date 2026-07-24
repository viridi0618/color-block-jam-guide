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
  return { id: playlistId, title: "Color Block Jam", entries };
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

let payload: { entries?: unknown[] };
try {
  payload = process.env.YOUTUBE_API_KEY
    ? await fetchWithApi(process.env.YOUTUBE_API_KEY)
    : await fetchWithYtDlp();
  await writeFile(output, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(`Fetched playlist entries: ${payload.entries?.length ?? 0}`);
} catch (error) {
  const cached = JSON.parse(await readFile(output, "utf8")) as {
    entries?: unknown[];
  };
  if (!cached.entries?.length) throw error;
  console.warn("Live fetch was unavailable; using the existing complete metadata snapshot.");
  console.log(`Cached playlist entries: ${cached.entries.length}`);
}
