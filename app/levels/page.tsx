import { LevelRanges } from "@/components/LevelRanges";
import { LevelSearch } from "@/components/LevelSearch";
import { approvedLevelIds, levelRanges } from "@/lib/levels";

export const metadata = {
  title: "All Color Block Jam Levels",
  description:
    "Browse every available Color Block Jam level walkthrough in the verified video library.",
  alternates: { canonical: "/levels" },
};

export default function LevelsPage() {
  return (
    <main className="shell page-shell">
      <header className="page-heading">
        <p className="kicker">Walkthrough index</p>
        <h1>All available levels</h1>
        <p>
          Search directly or open one 50-level range at a time. Only levels
          with a matched walkthrough video are listed.
        </p>
      </header>
      <LevelSearch approvedLevels={approvedLevelIds} />
      <div style={{ height: 24 }} aria-hidden="true" />
      <LevelRanges ranges={levelRanges} initialRange={levelRanges[0]?.label} />
    </main>
  );
}
