import rawLevels from "@/data/levels/all-levels.json";
import type { LevelRange, LevelRecord } from "./types";

export const levels = (rawLevels as LevelRecord[])
  .filter((level) => level.status === "approved")
  .sort((a, b) => a.levelId - b.levelId);

export const approvedLevelIds = levels.map((level) => level.levelId);

const levelMap = new Map(levels.map((level) => [level.levelId, level]));

export function getLevel(levelId: number) {
  return levelMap.get(levelId);
}

export function getAdjacentLevels(levelId: number) {
  const index = approvedLevelIds.indexOf(levelId);
  return {
    previous: index > 0 ? approvedLevelIds[index - 1] : null,
    next:
      index >= 0 && index < approvedLevelIds.length - 1
        ? approvedLevelIds[index + 1]
        : null,
  };
}

const grouped = new Map<number, number[]>();
for (const levelId of approvedLevelIds) {
  const start = Math.floor((levelId - 1) / 50) * 50 + 1;
  const values = grouped.get(start) ?? [];
  values.push(levelId);
  grouped.set(start, values);
}

export const levelRanges: LevelRange[] = Array.from(grouped.entries()).map(
  ([start, rangeLevels]) => ({
    label: `${start}-${start + 49}`,
    slug: `/levels/${start}-${start + 49}`,
    start,
    end: start + 49,
    levels: rangeLevels,
  }),
);

export function getRangeForLevel(levelId: number) {
  return levelRanges.find((range) => range.levels.includes(levelId));
}

export function getRangeByLabel(label: string) {
  return levelRanges.find((range) => range.label === label);
}
