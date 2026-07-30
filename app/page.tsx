import Image from "next/image";
import Link from "next/link";
import { LevelSearch } from "@/components/LevelSearch";
import { LevelRanges } from "@/components/LevelRanges";
import { IntentLinks } from "@/components/IntentLinks";
import { OnlineGamePlayer } from "@/components/OnlineGamePlayer";
import { OnlineGameHeading } from "@/components/OnlineGameHeading";
import { approvedLevelIds, levelRanges, levels } from "@/lib/levels";
import { siteUrl } from "@/lib/site-url";

export const metadata = {
  title: {
    absolute: "Color Block Jam Level Walkthroughs & Solutions",
  },
  description:
    "Find Color Block Jam level walkthroughs by number or range, watch matched video solutions, and quickly get back to the puzzle you're stuck on.",
  alternates: { canonical: "/" },
};

const latest = levels.slice(-6).reverse();
const featuredIndexes = [0, 99, 399, 799, 1399, levels.length - 1];
const featured = featuredIndexes.map((index) => levels[Math.min(index, levels.length - 1)])
  .filter((level, index, items) => items.findIndex((item) => item.levelId === level.levelId) === index);
const featuredIds = new Set(featured.map((level) => level.levelId));
const latestExcludingFeatured = latest.filter((level) => !featuredIds.has(level.levelId));
const collage = featured.slice(1, 5);

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Color Block Jam Guide",
  alternateName: "Color Block Jam Level Guide",
  url: siteUrl,
};

function WalkthroughCard({ level, latestLabel = false }: { level: (typeof levels)[number]; latestLabel?: boolean }) {
  return (
    <Link className="video-tile" href={level.slug}>
      <div className="tile-image">
        <Image src={level.primaryVideo.thumbnailUrl} alt="" fill sizes="(max-width: 680px) 50vw, 280px" />
        {latestLabel ? <span className="new-badge">New</span> : null}
      </div>
      <div className="tile-copy"><strong>Level {level.levelId}</strong><span>Watch Solution →</span></div>
    </Link>
  );
}

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />
    <main>
      <section className="hero shell">
        <div className="hero-copy-column">
          <p className="soft-badge">Your cozy puzzle helper</p>
          <h1>Color Block Jam Level Walkthroughs</h1>
          <p className="hero-copy">Stuck on a level? Enter your level number and watch the solution.</p>
          <div id="find-level">
            <LevelSearch approvedLevels={approvedLevelIds} />
          </div>
          <p className="hero-note">{approvedLevelIds.length.toLocaleString()} level pages ready to explore</p>
        </div>
        <div className="hero-collage" aria-label="Walkthrough previews">
          {collage.map((level) => (
            <Link href={level.slug} key={level.levelId} aria-label={`Level ${level.levelId} walkthrough`}>
              <Image src={level.primaryVideo.thumbnailUrl} alt="" fill sizes="(max-width: 680px) 50vw, 240px" />
              <span>Level {level.levelId}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="home-section shell">
        <div className="section-heading"><div><p className="kicker">Handy starting points</p><h2>Featured Walkthroughs</h2></div></div>
        <div className="video-grid">{featured.map((level) => <WalkthroughCard level={level} key={level.levelId} />)}</div>
      </section>

      <section className="home-section shell">
        <OnlineGameHeading
          as="h2"
          badge="Play in Your Browser"
          title="Play Color Block Jam Online"
          description="Start a quick browser puzzle game directly on this page, then return to a level walkthrough whenever you need help."
        />
        <OnlineGamePlayer sourcePage="home" compact />
      </section>

      <section className="home-section shell">
        <div className="section-heading"><div><p className="kicker">Pick a chapter</p><h2>Browse by Level Range</h2></div></div>
        <LevelRanges ranges={levelRanges.slice(0, 8)} compact />
        <Link className="center-link" href="/levels">Browse All Color Block Jam Levels →</Link>
      </section>

      <section className="home-section shell">
        <div className="section-heading"><div><p className="kicker">Recently added to this site</p><h2>Latest Walkthroughs</h2></div></div>
        <div className="video-grid">{latestExcludingFeatured.map((level) => <WalkthroughCard level={level} latestLabel key={level.levelId} />)}</div>
      </section>

      <section className="home-section shell">
        <div className="section-heading centered"><div><p className="kicker">Simple and quick</p><h2>How It Works</h2></div></div>
        <div className="how-grid">
          <article><span>1</span><h3>Enter your level</h3><p>Type the number shown in your game.</p></article>
          <article><span>2</span><h3>Watch the walkthrough</h3><p>Open the matched creator video.</p></article>
          <article><span>3</span><h3>Keep playing</h3><p>Return to your puzzle and move forward.</p></article>
        </div>
      </section>

      <section className="home-section shell">
        <div className="section-heading"><div><p className="kicker">More game help</p><h2>Game Help</h2></div></div>
        <IntentLinks />
      </section>

      <section className="trust-note shell">
        <h2>A calm place for quick puzzle help</h2>
        <p>Every indexed page is connected to an explicitly titled public walkthrough. No login, autoplay, or distracting pop-ups.</p>
      </section>
    </main>

    {/* Directory badges */}
    <section className="shell" style={{ paddingTop: "24px", paddingBottom: "32px", display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center", justifyContent: "center" }}>
      <a href="https://artificin.com?utm_source=badge&utm_medium=referral&utm_campaign=featured_badge" target="_blank" rel="noopener"><img src="https://artificin.com/badges/Artificin-badge.png" alt="Featured on Artificin" style={{ border: "none", width: "175px", height: "50px" }} /></a>
      <a href="https://findly.tools/color-block-jam?utm_source=color-block-jam" target="_blank" rel="noopener noreferrer"><img src="https://findly.tools/badges/findly-tools-badge-light.svg" alt="Featured on Findly.tools" width="150" /></a>
      <a href="https://startupfa.me/s/color-block-jam-1?utm_source=colorblockjam.wiki" target="_blank" rel="noopener noreferrer"><img src="https://startupfa.me/badges/featured/default-small-rounded.webp" alt="Color Block Jam - Featured on Startup Fame" width="240" height="37" /></a>
    </section>
    </>
  );
}