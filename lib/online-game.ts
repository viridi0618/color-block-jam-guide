export const onlineGameConfig = {
  enabled: process.env.NEXT_PUBLIC_ONLINE_GAME_ENABLED === "true",
  embedUrl: (process.env.NEXT_PUBLIC_ONLINE_GAME_EMBED_URL ?? "").trim(),
  openUrl: (process.env.NEXT_PUBLIC_ONLINE_GAME_OPEN_URL ?? "").trim(),
  coverUrl: (process.env.NEXT_PUBLIC_ONLINE_GAME_COVER_URL ?? "").trim(),
  aspectRatio: process.env.NEXT_PUBLIC_ONLINE_GAME_ASPECT_RATIO ?? "9/16",
  provider: "1games",
} as const;

/** Game is only available when enabled AND embedUrl is non-empty. */
export const onlineGameAvailable =
  onlineGameConfig.enabled && onlineGameConfig.embedUrl.length > 0;