import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlternativeVideo } from "@/components/AlternativeVideo";
import { ShareLevel } from "@/components/ShareLevel";
import { VideoEmbed } from "@/components/VideoEmbed";
import { getAdjacentLevels, getLevel, getRangeForLevel, levels } from "@/lib/levels";
import { siteUrl } from "@/lib/site-url";

export const dynamicParams = false;
export function generateStaticParams() { return levels.map((level) => ({ levelId: String(level.levelId) })); }
export async function generateMetadata({ params }: { params: Promise<{ levelId: string }> }): Promise<Metadata> {
  const { levelId: raw } = await params;
  const levelId = Number(raw);
  const level = getLevel(levelId);
  if (!level) return {};
  const title = `Color Block Jam Level ${levelId} Walkthrough`;
  const description = `Watch a video walkthrough for Color Block Jam Level ${levelId}.`;
  return {
    title,
    description,
    alternates: { canonical: `/level/${levelId}` },
    openGraph: { title, description, type: "video.other", images: [level.primaryVideo.thumbnailUrl] },
  };
}

export default async function LevelPage({ params }: { params: Promise<{ levelId: string }> }) {
  const { levelId: raw } = await params;
  const levelId = Number(raw);
  const level = getLevel(levelId);
  if (!level) notFound();
  const adjacent = getAdjacentLevels(levelId);
  const range = getRangeForLevel(levelId);
  if (!range) notFound();
  const canonicalUrl = `${siteUrl}/level/${levelId}`;
  const video = level.primaryVideo;
  const dual = level.sourceLevelIds.length === 2;
  const labels = level.sourceLevelIds;
  const videoSchema = {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: video.title,
    description: `Color Block Jam Level ${levelId} video walkthrough from ${video.channelTitle}.`,
    thumbnailUrl: [video.thumbnailUrl],
    ...(video.publishedAt ? { uploadDate: video.publishedAt } : {}),
    embedUrl: `https://www.youtube-nocookie.com/embed/${video.videoId}`,
  };
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
      { "@type": "ListItem", position: 2, name: "All Levels", item: `${siteUrl}/levels` },
      { "@type": "ListItem", position: 3, name: `Levels ${range.label}`, item: `${siteUrl}${range.slug}` },
      { "@type": "ListItem", position: 4, name: `Level ${levelId}`, item: canonicalUrl },
    ],
  };
  return (
    <main className="shell page-shell level-page">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link href="/">Home</Link><span>›</span><Link href="/levels">All Levels</Link><span>›</span>
        <Link href={range.slug}>Levels {range.start}–{range.end}</Link><span>›</span><span>Level {levelId}</span>
      </nav>
      <header className="level-heading">
        <span className="source-pill">Video Walkthrough</span>
        <h1>Color Block Jam Level {levelId} Walkthrough</h1>
        <p>Watch the solution and get back to your puzzle.</p>
      </header>
      <ShareLevel levelId={levelId} canonicalUrl={canonicalUrl} compact />
      <VideoEmbed video={video} />
      <div className="level-nav" aria-label="Level navigation">
        {adjacent.previous ? (
          <Link className="nav-button previous" href={`/level/${adjacent.previous}`}>
            <span>← Previous Level</span><small>Level {adjacent.previous}</small>
          </Link>
        ) : <span className="nav-button disabled">First available level</span>}
        {adjacent.next ? (
          <Link className="nav-button next" href={`/level/${adjacent.next}`}>
            <span>Next Level →</span><small>Level {adjacent.next}</small>
          </Link>
        ) : <span className="nav-button disabled">Last available level</span>}
      </div>
      <ShareLevel levelId={levelId} canonicalUrl={canonicalUrl} />
      {level.alternativeVideos.length ? (
        <section className="content-card">
          <h2>Alternative walkthrough</h2>
          <p>This video loads only when you choose it.</p>
          {level.alternativeVideos.map((alternative) => <AlternativeVideo video={alternative} key={alternative.videoId} />)}
        </section>
      ) : null}
      {level.isRangeVideo && level.rangeStart != null && level.rangeEnd != null ? (
        <aside className="dual-note">
          This video covers Levels {level.rangeStart}–{level.rangeEnd}.<br />
          Level numbering or layouts may vary after game updates.
        </aside>
      ) : dual ? (
        <aside className="dual-note">
          The video creator labels this walkthrough for Levels {labels[0]} and {labels[1]}.<br />
          Level numbering or layouts may vary after game updates.
        </aside>
      ) : null}
      <section className="content-card source-card">
        <h2>Video source</h2>
        <p>This page embeds a public YouTube video from <strong>{video.channelTitle}</strong>. The player preserves creator attribution and original controls.</p>
        <p>This unofficial fan-made guide is not affiliated with Rollic Games or YouTube. Videos remain the property of their respective creators.</p>
        <p><Link className="text-link" href={range.slug}>More levels in {range.start}–{range.end} →</Link></p>
        <p><Link className="text-link" href="/levels">All Color Block Jam Level Walkthroughs</Link></p>
      </section>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(videoSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
    </main>
  );
}
