import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LevelSearch } from "@/components/LevelSearch";
import { approvedLevelIds, getRangeByLabel, levelRanges } from "@/lib/levels";

export const dynamicParams = false;
export function generateStaticParams() { return levelRanges.map((range) => ({ range: range.label })); }
export async function generateMetadata({ params }: { params: Promise<{ range: string }> }): Promise<Metadata> {
  const { range: label } = await params;
  const range = getRangeByLabel(label);
  if (!range) return {};
  return {
    title: `Color Block Jam Levels ${range.start}–${range.end} Walkthroughs`,
    description: `Browse Color Block Jam Levels ${range.start}–${range.end} walkthrough videos.`,
    alternates: { canonical: range.slug },
  };
}

export default async function LevelRangePage({ params }: { params: Promise<{ range: string }> }) {
  const { range: label } = await params;
  const range = getRangeByLabel(label);
  if (!range) notFound();
  const index = levelRanges.findIndex((item) => item.label === label);
  const previous = index > 0 ? levelRanges[index - 1] : null;
  const next = index < levelRanges.length - 1 ? levelRanges[index + 1] : null;
  return (
    <main className="shell page-shell">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link href="/">Home</Link><span>›</span><Link href="/levels">All Levels</Link><span>›</span><span>Levels {range.start}–{range.end}</span>
      </nav>
      <header className="page-heading">
        <p className="soft-badge">Level range</p>
        <h1>Color Block Jam Levels {range.start}–{range.end} Walkthroughs</h1>
        <p>Choose from {range.levels.length} available solutions in this range.</p>
      </header>
      <LevelSearch approvedLevels={approvedLevelIds} />
      <div className="level-grid range-page-grid">
        {range.levels.map((levelId) => <Link href={`/level/${levelId}`} className="level-chip" key={levelId}>Level {levelId}</Link>)}
      </div>
      <nav className="range-nav" aria-label="Range navigation">
        {previous ? <Link href={previous.slug}>← Levels {previous.start}–{previous.end}</Link> : <span />}
        <Link href="/levels">All Levels</Link>
        {next ? <Link href={next.slug}>Levels {next.start}–{next.end} →</Link> : <span />}
      </nav>
    </main>
  );
}
