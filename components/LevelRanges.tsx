import Link from "next/link";
import type { LevelRange } from "@/lib/types";

export function LevelRanges({ ranges, compact = false }: { ranges: LevelRange[]; compact?: boolean }) {
  return (
    <div className={`range-list ${compact ? "compact" : ""}`}>
      {ranges.map((range, index) => (
        <Link className={`range-card accent-${(index % 4) + 1}`} href={range.slug} key={range.label}>
          <span className="range-icon" aria-hidden="true"><i /><i /><i /></span>
          <span><strong>Levels {range.start}–{range.end}</strong><small>{range.levels.length} walkthroughs</small></span>
          <span className="range-arrow" aria-hidden="true">→</span>
        </Link>
      ))}
    </div>
  );
}
