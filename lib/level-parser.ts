// ─── Title Parsing ────────────────────────────────────────────────

// Range pattern: Level A-B (must be checked BEFORE single-level patterns)
const RANGE_PATTERN =
  /\bColor\s*Block\s*Jam\s*[-–—:]?\s*(?:Levels?|Lvls?)\s*#?\s*(\d{1,5})\s*[-–—]\s*(\d{1,5})\b/i;

// Single-level patterns
const LEVEL_PATTERN =
  /\bColor\s*Block\s*Jam\s*[-–—:]?\s*(?:Level|Lvl)\s*#?\s*(\d{1,5})(?:\s*\(\s*(\d{1,5})\s*\))?\b/i;
const PARENTHETICAL_PATTERN =
  /\bColor\s*Block\s*Jam\s*[-–—:]?\s*(?:Level|Lvl)\s*#?\s*(\d{1,5})\s*\(\s*(\d{1,5})\s*\)/i;

export interface RangeParseResult {
  type: "range";
  rangeStart: number;
  rangeEnd: number;
  sourceLevelIds: number[];
}

export interface SingleParseResult {
  type: "single";
  primaryLevelId: number;
  alternateLevelId: number | null;
  sourceLevelIds: number[];
}

export interface RejectedRangeResult {
  type: "rejected-range";
  rangeStart: number;
  rangeEnd: number;
  reason: string;
}

export type ParseResult = RangeParseResult | SingleParseResult | RejectedRangeResult | null;

export function parseLevelTitle(title: string): ParseResult {
  // 1. Check range format FIRST (Level A-B)
  const rangeMatch = title.match(RANGE_PATTERN);
  if (rangeMatch) {
    const a = Number(rangeMatch[1]);
    const b = Number(rangeMatch[2]);

    // Validate: must be positive integers
    if (a <= 0 || b <= 0) {
      return {
        type: "rejected-range",
        rangeStart: a,
        rangeEnd: b,
        reason: `Range contains non-positive number (${a}-${b})`,
      };
    }

    // Validate: B must be >= A (reversed range)
    if (b < a) {
      return {
        type: "rejected-range",
        rangeStart: a,
        rangeEnd: b,
        reason: `Reversed range (${a}-${b})`,
      };
    }

    // Validate: range size <= 50
    if (b - a + 1 > 50) {
      return {
        type: "rejected-range",
        rangeStart: a,
        rangeEnd: b,
        reason: `Range too large (${b - a + 1} > 50)`,
      };
    }

    // Valid range
    const sourceLevelIds: number[] = [];
    for (let i = a; i <= b; i++) sourceLevelIds.push(i);
    return { type: "range", rangeStart: a, rangeEnd: b, sourceLevelIds };
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

export const DEMOTION_WORDS = [
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

export const STANDARD_TITLE_PATTERNS = [
  /\bLevel\s+\d+\s+Solution\s+Walkthrough\b/i,
  /\bLevel\s+\d+\s+Walkthrough\b/i,
  /\bLevel\s+\d+\s+Solution\b/i,
  /\bLevel\s+\d+\s+Guide\b/i,
  /\bLevels?\s+\d+[\s-]+\d+\s+Solution\s+Walkthrough\b/i,
];

export function isDemoted(title: string): boolean {
  return DEMOTION_WORDS.some((pattern) => pattern.test(title));
}

export function isStandardTitle(title: string): boolean {
  return STANDARD_TITLE_PATTERNS.some((pattern) => pattern.test(title));
}

export interface Rankable {
  matchType?: string;
  priority?: number;
  title: string;
  embeddable?: boolean | null;
  videoAvailable?: boolean;
  publishedAt?: string | null;
  playlistPosition?: number;
  videoId?: string;
}

export function scoreVideo(candidate: Rankable): number {
  let score = 0;

  // 1. Primary-label has highest priority
  if (candidate.matchType === "primary-label") score += 1000;

  // 2. Source priority
  score += candidate.priority ?? 0;

  // 3. Standard walkthrough title bonus
  if (isStandardTitle(candidate.title)) score += 200;

  // 4. Demotion penalty
  if (isDemoted(candidate.title)) score -= 300;

  // 5. Embeddable and available
  if (candidate.embeddable === false) score -= 10000;
  if (candidate.videoAvailable === false) score -= 10000;

  // 6. Published date (newer = higher, null = lowest)
  if (candidate.publishedAt) score += 1;

  return score;
}

export function rankCandidates(a: Rankable, b: Rankable): number {
  const scoreDiff = scoreVideo(b) - scoreVideo(a);
  if (scoreDiff !== 0) return scoreDiff;

  // PublishedAt tiebreaker: newer first
  const pubDiff = (b.publishedAt ?? "").localeCompare(a.publishedAt ?? "");
  if (pubDiff !== 0) return pubDiff;

  // Playlist position tiebreaker: lower position (earlier) first
  if (a.playlistPosition != null && b.playlistPosition != null) {
    if (a.playlistPosition !== b.playlistPosition) {
      return a.playlistPosition - b.playlistPosition;
    }
  }

  // videoId as final stable tiebreaker
  return (a.videoId ?? "").localeCompare(b.videoId ?? "");
}