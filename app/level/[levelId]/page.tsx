import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlternativeVideo } from "@/components/AlternativeVideo";
import { ShareLevel } from "@/components/ShareLevel";
import { VideoEmbed } from "@/components/VideoEmbed";
import { getAdjacentLevels, getLevel, getRangeForLevel, levels } from "@/lib/levels";
import { getRelatedLevels } from "@/lib/internal-links";
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
  const relatedLevels = getRelatedLevels(levelId);
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
        <p className="video-attribution">
          Video walkthrough by{" "}
          <a
            href={`https://www.youtube.com/watch?v=${video.videoId}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {video.channelTitle}
          </a>{" "}
          on YouTube.
        </p>
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
      {level.alternativeVideos.length ? (
        <section className="content-card">
          <h2>Alternative walkthrough</h2>
          <p>This video loads only when you choose it.</p>
          {level.alternativeVideos.map((alternative) => <AlternativeVideo video={alternative} key={alternative.videoId} />)}
        </section>
      ) : null}
      {level.isRangeVideo && level.rangeStart != null && level.rangeEnd != null ? (
        <aside className="dual-note">
          Level {levelId} is included in this Levels {level.rangeStart}–{level.rangeEnd} walkthrough compilation.<br />
          Use the video player to find the Level {levelId} section.
        </aside>
      ) : dual ? (
        <aside className="dual-note">
          The video creator labels this walkthrough for Levels {labels[0]} and {labels[1]}.<br />
          Level numbering or layouts may vary after game updates.
        </aside>
      ) : null}
      {relatedLevels.length > 0 ? (
        <section className="content-card related-levels-card">
          <h2>More Levels to Explore</h2>
          <nav aria-label="Related level walkthroughs" className="related-levels-nav">
            {relatedLevels.map((rl) => (
              <Link key={rl.levelId} href={rl.href} className="related-level-link">
                {rl.label}
              </Link>
            ))}
            <Link href={range.slug} className="related-level-link range-link">
              Levels {range.start}–{range.end}
            </Link>
            <Link href="/levels" className="related-level-link all-link">
              Browse All Levels
            </Link>
          </nav>
        </section>
      ) : null}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(videoSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
    </main>
  );
}
