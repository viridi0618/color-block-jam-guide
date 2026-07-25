import { LevelRanges } from "@/components/LevelRanges";
import { LevelSearch } from "@/components/LevelSearch";
import { approvedLevelIds, levelRanges } from "@/lib/levels";
import { siteUrl } from "@/lib/site-url";

export const metadata = {
  title: "All Color Block Jam Levels",
  description: "Browse every available Color Block Jam level walkthrough by range or search by level number.",
  alternates: { canonical: "/levels" },
};

export default function LevelsPage() {
  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: levelRanges.map((range, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      name: `Color Block Jam Levels ${range.start}–${range.end}`,
      url: `${siteUrl}${range.slug}`,
    })),
  };

  return (
    <main className="shell page-shell">
      <header className="page-heading">
        <p className="soft-badge">All walkthroughs</p>
        <h1>All Color Block Jam Levels</h1>
        <p>Search directly or choose a 50-level range. Only levels with a mapped walkthrough are listed.</p>
      </header>
      <LevelSearch approvedLevels={approvedLevelIds} />
      <section className="levels-index" aria-label="Available level ranges"><LevelRanges ranges={levelRanges} /></section>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }}
      />
    </main>
  );
}
