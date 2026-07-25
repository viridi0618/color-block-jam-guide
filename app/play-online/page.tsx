import Image from "next/image";
import Link from "next/link";
import { PlayOnlineLevelSearch } from "@/components/PlayOnlineLevelSearch";
import { OnlineGamePlayer } from "@/components/OnlineGamePlayer";
import { PlayOnlineViewTracker } from "@/components/PlayOnlineViewTracker";
import { approvedLevelIds, levels } from "@/lib/levels";
import { onlineGameAvailable } from "@/lib/online-game";

export const metadata = {
  title: "Play Color Block Jam Online",
  description:
    "Play Color Block Jam online in your browser, then browse level walkthroughs and solutions.",
  alternates: { canonical: "/play-online" },
};

const latestLevels = levels.slice(-6).reverse();

function WalkthroughCard({
  level,
}: {
  level: (typeof levels)[number];
}) {
  return (
    <Link className="video-tile" href={level.slug}>
      <div className="tile-image">
        <Image
          src={level.primaryVideo.thumbnailUrl}
          alt=""
          fill
          sizes="(max-width: 680px) 50vw, 280px"
        />
      </div>
      <div className="tile-copy">
        <strong>Level {level.levelId}</strong>
        <span>Watch Solution →</span>
      </div>
    </Link>
  );
}

export default function PlayOnlinePage() {
  if (!onlineGameAvailable) {
    return (
      <main className="shell page-shell intent-page">
        <PlayOnlineViewTracker />
        <header className="page-heading">
          <p className="soft-badge">Browser game</p>
          <h1>Play Color Block Jam Online</h1>
          <p>
            The browser game is temporarily unavailable. Browse level
            walkthroughs while it is being restored.
          </p>
        </header>

        <section className="content-card">
          <h2>Looking for a walkthrough?</h2>
          <p>Search by level number.</p>
          <PlayOnlineLevelSearch approvedLevels={approvedLevelIds} />
        </section>

        <section className="content-card">
          <h2>Latest Level Guides</h2>
          <div className="video-grid">
            {latestLevels.map((level) => (
              <WalkthroughCard level={level} key={level.levelId} />
            ))}
          </div>
        </section>

        <div className="inline-links">
          <Link href="/download">Download</Link>
          <Link href="/play-on-pc">Play on PC</Link>
          <Link href="/faq">FAQ</Link>
          <Link href="/levels">All Level Guides</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="shell page-shell intent-page">
      <PlayOnlineViewTracker />
      <header className="page-heading">
        <p className="soft-badge">Browser game</p>
        <h1>Play Color Block Jam Online</h1>
        <p>Start a quick browser puzzle game.</p>
      </header>

      <OnlineGamePlayer sourcePage="play_online" />

      <section className="content-card">
        <h2>Looking for a walkthrough?</h2>
        <p>Search by level number.</p>
        <PlayOnlineLevelSearch approvedLevels={approvedLevelIds} />
      </section>

      <section className="content-card">
        <h2>Latest Level Guides</h2>
        <div className="video-grid">
          {latestLevels.map((level) => (
            <WalkthroughCard level={level} key={level.levelId} />
          ))}
        </div>
      </section>

      <div className="inline-links">
        <Link href="/download">Download</Link>
        <Link href="/play-on-pc">Play on PC</Link>
        <Link href="/faq">FAQ</Link>
        <Link href="/levels">All Level Guides</Link>
      </div>
    </main>
  );
}