const DEFAULT_GAME_EMBED_URL = "https://1games.io/game/color-block-jam/";
const DEFAULT_GAME_OPEN_URL = "https://1games.io/game/color-block-jam/";

const enabledValue = process.env.NEXT_PUBLIC_ONLINE_GAME_ENABLED;

export const onlineGameConfig = {
  /** Game is enabled by default. Set NEXT_PUBLIC_ONLINE_GAME_ENABLED=false to disable. */
  enabled: enabledValue !== "false",

  embedUrl:
    process.env.NEXT_PUBLIC_ONLINE_GAME_EMBED_URL?.trim() ||
    DEFAULT_GAME_EMBED_URL,

  openUrl:
    process.env.NEXT_PUBLIC_ONLINE_GAME_OPEN_URL?.trim() ||
    DEFAULT_GAME_OPEN_URL,

  coverUrl: process.env.NEXT_PUBLIC_ONLINE_GAME_COVER_URL?.trim() || "",

  aspectRatio:
    process.env.NEXT_PUBLIC_ONLINE_GAME_ASPECT_RATIO?.trim() || "9/16",

  provider: "1games",
} as const;

/** Game is only available when enabled AND embedUrl is non-empty. */
export const onlineGameAvailable =
  onlineGameConfig.enabled && onlineGameConfig.embedUrl.length > 0;