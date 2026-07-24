import { LevelRanges } from "@/components/LevelRanges";
import { LevelSearch } from "@/components/LevelSearch";
import { approvedLevelIds, levelRanges } from "@/lib/levels";

export const metadata = {
  title: "All Color Block Jam Levels",
  description: "Browse every available Color Block Jam level walkthrough.",
  alternates: { canonical: "/levels" },
};

export default function LevelsPage() {
  return (
    <main className="shell page-shell">
      <header className="page-heading">
        <p className="soft-badge">All walkthroughs</p>
        <h1>All Color Block Jam Levels</h1>
        <p>Search directly or choose a 50-level range. Only levels with a mapped walkthrough are listed.</p>
      </header>
      <LevelSearch approvedLevels={approvedLevelIds} />
      <section className="levels-index" aria-label="Available level ranges"><LevelRanges ranges={levelRanges} /></section>
    </main>
  );
}
