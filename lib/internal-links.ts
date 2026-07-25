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

// ─── Related Levels (deterministic) ───────────────────────────────

const MAX_RELATED = 12;

/** Simple deterministic hash from levelId + offset */
function deterministicIndex(levelId: number, offset: number, max: number): number {
  // FNV-1a-like hash
  let h = 2166136261;
  h = (h ^ levelId) >>> 0;
  h = (h * 16777619) >>> 0;
  h = (h ^ offset) >>> 0;
  h = (h * 16777619) >>> 0;
  return h % max;
}

export interface RelatedLevel {
  levelId: number;
  label: string;
  href: string;
}

export function getRelatedLevels(
  levelId: number,
  maxResults = MAX_RELATED,
): RelatedLevel[] {
  const approvedSet = new Set(approvedLevelIds);
  const result: RelatedLevel[] = [];
  const seen = new Set<number>([levelId]); // exclude self

  function add(id: number) {
    if (seen.has(id)) return;
    if (!approvedSet.has(id)) return;
    if (result.length >= maxResults) return;
    seen.add(id);
    result.push({
      levelId: id,
      label: `Level ${id} Walkthrough`,
      href: `/level/${id}`,
    });
  }

  // 1. Neighbors: up to 2 previous, up to 2 next
  const idx = approvedLevelIds.indexOf(levelId);
  if (idx >= 0) {
    for (let i = idx - 1; i >= Math.max(0, idx - 2); i--) {
      add(approvedLevelIds[i]);
    }
    for (let i = idx + 1; i <= Math.min(approvedLevelIds.length - 1, idx + 2); i++) {
      add(approvedLevelIds[i]);
    }
  }

  // 2. Same-range levels: up to 4 from the same 50-level range
  const rangeStart = Math.floor((levelId - 1) / 50) * 50 + 1;
  const rangeEnd = rangeStart + 49;
  const rangeLevels = approvedLevelIds.filter(
    (id) => id >= rangeStart && id <= rangeEnd && id !== levelId,
  );
  for (const id of rangeLevels) {
    if (result.length >= maxResults) break;
    add(id);
  }

  // 3. Deterministic distant levels: fill remaining slots
  if (result.length < maxResults) {
    let offset = 0;
    while (result.length < maxResults && offset < approvedLevelIds.length * 2) {
      const candidate = approvedLevelIds[deterministicIndex(levelId, offset, approvedLevelIds.length)];
      add(candidate);
      offset++;
    }
  }

  return result.slice(0, maxResults);
}