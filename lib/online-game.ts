export const onlineGameConfig = {
  enabled: process.env.NEXT_PUBLIC_ONLINE_GAME_ENABLED === "true",
  embedUrl: process.env.NEXT_PUBLIC_ONLINE_GAME_EMBED_URL ?? "",
  openUrl: process.env.NEXT_PUBLIC_ONLINE_GAME_OPEN_URL ?? "",
  coverUrl: process.env.NEXT_PUBLIC_ONLINE_GAME_COVER_URL ?? "",
  aspectRatio: process.env.NEXT_PUBLIC_ONLINE_GAME_ASPECT_RATIO ?? "9/16",
  provider: "1games",
} as const;