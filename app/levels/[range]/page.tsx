import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getRangeByLabel, levelRanges } from "@/lib/levels";

export const dynamicParams = false;

export function generateStaticParams() {
  return levelRanges.map((range) => ({ range: range.label }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ range: string }>;
}): Promise<Metadata> {
  const { range: label } = await params;
  const range = getRangeByLabel(label);
  if (!range) return {};
  return {
    title: `Color Block Jam Levels ${range.label} Walkthroughs`,
    description: `Browse the available Color Block Jam Levels ${range.label} walkthrough videos.`,
    alternates: { canonical: range.slug },
  };
}

export default async function LevelRangePage({
  params,
}: {
  params: Promise<{ range: string }>;
}) {
  const { range: label } = await params;
  const range = getRangeByLabel(label);
  if (!range) notFound();

  return (
    <main className="shell page-shell">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link href="/">Home</Link>
        <span aria-hidden="true">/</span>
        <Link href="/levels">All Levels</Link>
        <span aria-hidden="true">/</span>
        <span>Levels {range.label}</span>
      </nav>
      <header className="page-heading">
        <p className="kicker">Level range</p>
        <h1>Color Block Jam Levels {range.label} Walkthroughs</h1>
        <p>
          Choose one of the {range.levels.length} approved walkthrough videos
          currently available in this range.
        </p>
      </header>
      <div className="level-grid range-page-grid">
        {range.levels.map((levelId) => (
          <Link href={`/level/${levelId}`} className="level-chip" key={levelId}>
            Level {levelId}
          </Link>
        ))}
      </div>
      <div className="hub-return">
        <Link href="/levels" className="text-link">
          Browse all Color Block Jam level walkthroughs →
        </Link>
      </div>
    </main>
  );
}
