import Link from "next/link";
import { LevelSearch } from "@/components/LevelSearch";
import { LevelRanges } from "@/components/LevelRanges";
import { approvedLevelIds, levelRanges } from "@/lib/levels";

export const metadata = {
  title: "Color Block Jam Level Walkthroughs & Solutions",
  description:
    "Find Color Block Jam level walkthrough videos. Search by level number and watch the available solution.",
  alternates: { canonical: "/" },
};

export default function Home() {
  return (
    <main>
      <section className="hero shell">
        <div className="eyebrow">
          <span className="eyebrow-dot" aria-hidden="true" />
          Video walkthrough library
        </div>
        <h1>
          Find your <span>Color Block Jam</span> level
        </h1>
        <p className="hero-copy">
          Search the verified video library by level number and get straight
          back to the puzzle.
        </p>
        <LevelSearch approvedLevels={approvedLevelIds} />
        <div className="hero-meta" aria-label="Library summary">
          <strong>{approvedLevelIds.length}</strong> level videos
          <span aria-hidden="true">•</span>
          Updated from original creators
        </div>
      </section>

      <section className="ranges-section shell" aria-labelledby="browse-title">
        <div className="section-heading">
          <div>
            <p className="kicker">Browse the library</p>
            <h2 id="browse-title">Levels by range</h2>
          </div>
          <Link href="/levels" className="text-link">
            View all levels <span aria-hidden="true">→</span>
          </Link>
        </div>
        <LevelRanges ranges={levelRanges} initialRange={levelRanges[0]?.label} />
      </section>

      <section className="recent-section shell" aria-labelledby="recent-title">
        <div className="section-heading">
          <div>
            <p className="kicker">Recently added</p>
            <h2 id="recent-title">Latest walkthroughs</h2>
          </div>
        </div>
        <div className="recent-levels">
          {approvedLevelIds.slice(-6).reverse().map((levelId) => (
            <Link href={`/level/${levelId}`} key={levelId}>
              <span>New</span>
              Level {levelId}
            </Link>
          ))}
        </div>
      </section>

      <section className="trust-strip">
        <div className="shell trust-grid">
          <div className="trust-item">
            <span className="trust-icon coral" aria-hidden="true">▶</span>
            <div>
              <strong>Real walkthrough videos</strong>
              <p>No invented steps or filler guides.</p>
            </div>
          </div>
          <div className="trust-item">
            <span className="trust-icon blue" aria-hidden="true">✓</span>
            <div>
              <strong>Level-matched</strong>
              <p>Only approved level and video pairs are published.</p>
            </div>
          </div>
          <div className="trust-item">
            <span className="trust-icon yellow" aria-hidden="true">◇</span>
            <div>
              <strong>Built for quick help</strong>
              <p>Fast search, simple navigation, no pop-ups.</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
