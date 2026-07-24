import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlternativeVideo } from "@/components/AlternativeVideo";
import { ShareLevel } from "@/components/ShareLevel";
import { VideoEmbed } from "@/components/VideoEmbed";
import {
  getAdjacentLevels,
  getLevel,
  getRangeForLevel,
  levels,
} from "@/lib/levels";
import { siteUrl } from "@/lib/site-url";

export const dynamicParams = false;

export function generateStaticParams() {
  return levels.map((level) => ({ levelId: String(level.levelId) }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ levelId: string }>;
}): Promise<Metadata> {
  const { levelId: rawLevelId } = await params;
  const levelId = Number(rawLevelId);
  const level = getLevel(levelId);
  if (!level) return {};

  const title = `Color Block Jam Level ${levelId} Walkthrough`;
  const description = `Watch a video walkthrough for Color Block Jam Level ${levelId} and continue to the next available level guide.`;

  return {
    title,
    description,
    alternates: { canonical: `/level/${levelId}` },
    openGraph: {
      title,
      description,
      type: "video.other",
      images: [level.primaryVideo.thumbnailUrl],
    },
  };
}

export default async function LevelPage({
  params,
}: {
  params: Promise<{ levelId: string }>;
}) {
  const { levelId: rawLevelId } = await params;
  const levelId = Number(rawLevelId);
  const level = getLevel(levelId);
  if (!level) notFound();

  const adjacent = getAdjacentLevels(levelId);
  const range = getRangeForLevel(levelId);
  if (!range) notFound();
  const canonicalUrl = `${siteUrl}/level/${levelId}`;
  const video = level.primaryVideo;
  const videoSchema = {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: video.title,
    description: `Color Block Jam Level ${levelId} video walkthrough from ${video.channelTitle}.`,
    thumbnailUrl: [video.thumbnailUrl],
    ...(video.publishedAt ? { uploadDate: video.publishedAt } : {}),
    ...(video.durationSeconds
      ? { duration: `PT${video.durationSeconds}S` }
      : {}),
    embedUrl: `https://www.youtube-nocookie.com/embed/${video.videoId}`,
  };
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: siteUrl,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Levels",
        item: `${siteUrl}/levels`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: `Levels ${range.label}`,
        item: `${siteUrl}${range.slug}`,
      },
      {
        "@type": "ListItem",
        position: 4,
        name: `Level ${levelId}`,
        item: canonicalUrl,
      },
    ],
  };

  return (
    <main className="shell page-shell level-page">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link href="/">Home</Link>
        <span aria-hidden="true">/</span>
        <Link href="/levels">Levels</Link>
        <span aria-hidden="true">/</span>
        <Link href={range.slug}>Levels {range.label}</Link>
        <span aria-hidden="true">/</span>
        <span>Level {levelId}</span>
      </nav>

      <header className="level-heading">
        <span className="source-pill">Verified video match</span>
        <h1>Color Block Jam Level {levelId} Walkthrough</h1>
        <p>Watch the available solution video for this level.</p>
      </header>

      <ShareLevel levelId={levelId} canonicalUrl={canonicalUrl} compact />
      <VideoEmbed video={video} />
      <ShareLevel levelId={levelId} canonicalUrl={canonicalUrl} />

      <div className="level-nav" aria-label="Level navigation">
        {adjacent.previous ? (
          <Link className="nav-button" href={`/level/${adjacent.previous}`}>
            ← Level {adjacent.previous}
          </Link>
        ) : (
          <span className="nav-button disabled">First available</span>
        )}
        {adjacent.next ? (
          <Link
            className="nav-button next"
            href={`/level/${adjacent.next}`}
          >
            Level {adjacent.next} →
          </Link>
        ) : (
          <span className="nav-button disabled">Latest available</span>
        )}
      </div>

      {level.alternativeVideos.length ? (
        <section className="content-card" aria-labelledby="alternative-title">
          <h2 id="alternative-title">Alternative walkthroughs</h2>
          <p>These players load only when you choose to open them.</p>
          {level.alternativeVideos.map((alternative) => (
            <AlternativeVideo video={alternative} key={alternative.videoId} />
          ))}
        </section>
      ) : null}

      <section className="content-card">
        <h2>Video source</h2>
        <p>
          This page embeds a public YouTube video from{" "}
          <strong>{video.channelTitle}</strong>. The YouTube player preserves
          the creator attribution and original video controls.
        </p>
        <p>
          This is an unofficial fan-made walkthrough site. It is not affiliated
          with Rollic Games or YouTube. Videos remain the property of their
          respective creators.
        </p>
        <p>
          <Link className="text-link" href={range.slug}>
            See more approved levels in the {range.label} range →
          </Link>
        </p>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(videoSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
    </main>
  );
}
