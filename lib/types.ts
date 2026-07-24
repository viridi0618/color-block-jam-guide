export type AspectRatio = "16:9" | "9:16" | "4:3";
export type MatchType = "primary-label" | "parenthetical-label";

export interface WalkthroughVideo {
  videoId: string;
  title: string;
  channelTitle: string;
  sourceId: string;
  durationSeconds: number | null;
  publishedAt: string | null;
  thumbnailUrl: string;
  aspectRatio: AspectRatio;
  matchType: MatchType;
  mappingGroupId: string;
  sourceLevelIds: number[];
}

export interface LevelRecord {
  levelId: number;
  slug: string;
  status: "approved" | "candidate" | "unavailable";
  primaryVideo: WalkthroughVideo;
  alternativeVideos: WalkthroughVideo[];
  matchType: MatchType;
  sourceLevelIds: number[];
}

export interface LevelRange {
  label: string;
  slug: string;
  start: number;
  end: number;
  levels: number[];
}
