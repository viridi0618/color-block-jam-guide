import { approvedLevelIds, levelRanges } from "./levels";

// ─── Featured Levels ──────────────────────────────────────────────

const FEATURED_TARGETS = [
  1, 10, 16, 50, 100, 250, 500, 750, 1000, 1250, 1500, 1750, 2000, 2250,
  2500, 2600,
];

export interface FeaturedLink {
  levelId: number;
  label: string;
  href: string;
}

export function getFeaturedLevels(): FeaturedLink[] {
  const result: FeaturedLink[] = [];
  const approvedSet = new Set(approvedLevelIds);

  for (const target of FEATURED_TARGETS) {
    const levelId = approvedSet.has(target)
      ? target
      : approvedLevelIds.reduce((prev, curr) =>
          Math.abs(curr - target) < Math.abs(prev - target) ? curr : prev,
        );
    // Avoid duplicates
    if (result.some((r) => r.levelId === levelId)) continue;
    result.push({
      levelId,
      label: `Level ${levelId} Walkthrough`,
      href: `/level/${levelId}`,
    });
  }

  return result;
}

// ─── Featured Ranges ──────────────────────────────────────────────

export interface RangeLink {
  label: string;
  href: string;
  start: number;
  end: number;
}

export function getFeaturedRanges(): RangeLink[] {
  const ranges = levelRanges.slice(); // copy
  if (ranges.length === 0) return [];

  const picks: RangeLink[] = [];

  // First range
  picks.push({
    label: `Levels ${ranges[0].start}–${ranges[0].end}`,
    href: ranges[0].slug,
    start: ranges[0].start,
    end: ranges[0].end,
  });

  if (ranges.length === 1) return picks;

  // Middle ranges: pick evenly spaced samples
  const middleCount = Math.min(6, ranges.length - 2);
  if (middleCount > 0 && ranges.length > 2) {
    const step = (ranges.length - 2) / (middleCount + 1);
    for (let i = 1; i <= middleCount; i++) {
      const idx = Math.round(i * step);
      if (idx > 0 && idx < ranges.length - 1) {
        const r = ranges[idx];
        // Avoid duplicates
        if (!picks.some((p) => p.start === r.start)) {
          picks.push({
            label: `Levels ${r.start}–${r.end}`,
            href: r.slug,
            start: r.start,
            end: r.end,
          });
        }
      }
    }
  }

  // Last range
  const last = ranges[ranges.length - 1];
  if (!picks.some((p) => p.start === last.start)) {
    picks.push({
      label: `Levels ${last.start}–${last.end}`,
      href: last.slug,
      start: last.start,
      end: last.end,
    });
  }

  // Sort by start
  picks.sort((a, b) => a.start - b.start);

  return picks;
}

// ─── Related Levels (neighbors + same range only) ──────────────────

const MAX_SAME_RANGE = 4;
const MAX_LEVEL_LINKS = 6;

export interface RelatedLevel {
  levelId: number;
  label: string;
  href: string;
}

export function getRelatedLevels(levelId: number): RelatedLevel[] {
  const approvedSet = new Set(approvedLevelIds);
  const seen = new Set<number>([levelId]); // exclude self
  const result: RelatedLevel[] = [];

  function add(id: number): boolean {
    if (seen.has(id)) return false;
    if (!approvedSet.has(id)) return false;
    seen.add(id);
    result.push({
      levelId: id,
      label: `Level ${id} Walkthrough`,
      href: `/level/${id}`,
    });
    return true;
  }

  const rangeStart = Math.floor((levelId - 1) / 50) * 50 + 1;
  const rangeEnd = rangeStart + 49;

  // 1. Neighbors: up to 2 previous, up to 2 next
  const idx = approvedLevelIds.indexOf(levelId);
  let neighborCount = 0;
  if (idx >= 0) {
    for (let i = idx - 1; i >= Math.max(0, idx - 2); i--) {
      if (add(approvedLevelIds[i])) neighborCount++;
    }
    for (let i = idx + 1; i <= Math.min(approvedLevelIds.length - 1, idx + 2); i++) {
      if (add(approvedLevelIds[i])) neighborCount++;
    }
  }

  // 2. Same-range levels: fill remaining slots up to MAX_SAME_RANGE total
  const sameRangeRemaining = Math.max(0, MAX_SAME_RANGE - neighborCount);
  let sameRangeCount = 0;
  const rangeLevels = approvedLevelIds.filter(
    (id) => id >= rangeStart && id <= rangeEnd && id !== levelId,
  );
  for (const id of rangeLevels) {
    if (sameRangeCount >= sameRangeRemaining) break;
    if (add(id)) sameRangeCount++;
  }

  return result.slice(0, MAX_LEVEL_LINKS);
}