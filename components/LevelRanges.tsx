"use client";

import Link from "next/link";
import { useState } from "react";
import type { LevelRange } from "@/lib/types";

export function LevelRanges({
  ranges,
  initialRange,
}: {
  ranges: LevelRange[];
  initialRange?: string;
}) {
  const [openRange, setOpenRange] = useState(initialRange ?? null);

  return (
    <div className="range-list">
      {ranges.map((range) => {
        const isOpen = openRange === range.label;
        return (
          <section className="range-card" key={range.label}>
            <div className="range-header">
              <button
                className="range-toggle"
                type="button"
                aria-expanded={isOpen}
                aria-controls={`range-${range.start}-${range.end}`}
                onClick={() => setOpenRange(isOpen ? null : range.label)}
              >
                <span>
                  Levels {range.start}–{range.end}
                  <small>{range.levels.length} available</small>
                </span>
                <span className="chevron" aria-hidden="true">
                  {isOpen ? "−" : "+"}
                </span>
              </button>
              <Link className="range-page-link" href={range.slug}>
                Range page <span aria-hidden="true">→</span>
              </Link>
            </div>
            {isOpen ? (
              <div
                className="level-grid"
                id={`range-${range.start}-${range.end}`}
              >
                {range.levels.map((levelId) => (
                  <Link
                    href={`/level/${levelId}`}
                    className="level-chip"
                    key={levelId}
                  >
                    Level {levelId}
                  </Link>
                ))}
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
