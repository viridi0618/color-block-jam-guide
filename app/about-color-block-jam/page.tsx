import Link from "next/link";
import { officialLinks } from "@/lib/official-links";

export const metadata = {
  title: "Color Block Jam Developer, Platforms & Game Info",
  description: "Learn who made Color Block Jam, where it is available and how to get official help.",
  alternates: { canonical: "/about-color-block-jam" },
};

export default function AboutGamePage() {
  return (
    <main className="shell page-shell intent-page">
      <header className="page-heading">
        <p className="soft-badge">Game information</p>
        <h1>About Color Block Jam</h1>
        <p>Color Block Jam is a color-matching block puzzle published by Rollic Games.</p>
      </header>
      <article className="content-card prose-card">
        <h2>What is Color Block Jam?</h2>
        <p>The game asks players to move colorful blocks toward matching colored doors while working around obstacles and limited space. Its official store descriptions emphasize sliding, planning and clearing each puzzle before moving on to the next level. The rules are easy to understand, but layouts become more involved as new blockers and mechanics appear.</p>
        <h2>Who made Color Block Jam?</h2>
        <p>Apple’s App Store and Google Play both name <strong>Rollic Games</strong> as the developer or publisher. Rollic’s own company website also features Color Block Jam among its games. Google Play’s developer information identifies the company as Rollic Games Oyun Yazılım ve Pazarlama Anonim Şirketi.</p>
        <h2>Where can you play it?</h2>
        <p>The official App Store listing supports iPhone and iPad. Google Play provides the Android version, and an official Google Play Games listing makes the game available on supported Windows PCs. We did not identify an official browser edition on the official pages checked on July 24, 2026.</p>
        <h2>Is it free?</h2>
        <p>The Apple listing marks the game as free with optional in-app purchases. Google Play lists ads and in-app purchases. Store terms and availability can vary by country, so the current official listing is the best source before installing or buying anything.</p>
        <h2>Where can players get help?</h2>
        <p>Rollic provides an official player support center covering technical help, billing, ads, privacy requests and bug reports. For a stuck puzzle rather than an account or technical issue, use this site’s level search to open the matching walkthrough page.</p>
      </article>
      <div className="source-links">
        <a href={officialLinks.rollic} target="_blank" rel="noreferrer">Rollic official site ↗</a>
        <a href={officialLinks.rollicSupport} target="_blank" rel="noreferrer">Official player support ↗</a>
      </div>
      <div className="inline-links">
        <Link href="/download">Download</Link><Link href="/play-on-pc">Play on PC</Link>
        <Link href="/play-online">Play Online</Link><Link href="/faq">FAQ</Link><Link href="/levels">Level walkthroughs</Link>
      </div>
    </main>
  );
}
