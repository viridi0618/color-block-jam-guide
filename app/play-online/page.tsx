import Link from "next/link";
import { officialLinks } from "@/lib/official-links";

export const metadata = {
  title: "Can You Play Color Block Jam Online?",
  description: "Find out whether an official Color Block Jam browser version is available.",
  alternates: { canonical: "/play-online" },
};

export default function OnlinePage() {
  return (
    <main className="shell page-shell intent-page">
      <header className="page-heading">
        <p className="soft-badge">Browser availability</p>
        <h1>Play Color Block Jam Online</h1>
        <p>We did not find a verified official browser version of Color Block Jam on the official publisher and store pages checked on July 24, 2026.</p>
      </header>
      <section className="answer-card">
        <span aria-hidden="true">◎</span><div><h2>No official web version identified</h2><p>Color Block Jam is officially available through Apple’s App Store, Google Play for Android, and Google Play Games on Windows. Those are the verified ways to play.</p></div>
      </section>
      <section className="content-card">
        <h2>Avoid misleading copies</h2>
        <p>Sites using a similar name may host clones or unrelated puzzle games. This guide does not embed them or describe them as the official game, and it does not use a misleading “Play Now” button.</p>
      </section>
      <div className="inline-links">
        <a href={officialLinks.appStore} target="_blank" rel="noreferrer">Official iOS listing ↗</a>
        <a href={officialLinks.googlePlay} target="_blank" rel="noreferrer">Official Android listing ↗</a>
        <Link href="/play-on-pc">Official PC option</Link>
      </div>
    </main>
  );
}
