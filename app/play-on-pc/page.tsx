import Link from "next/link";
import { officialLinks } from "@/lib/official-links";

export const metadata = {
  title: "How to Play Color Block Jam on PC",
  description: "Play Color Block Jam on Windows through the official Google Play Games PC listing.",
  alternates: { canonical: "/play-on-pc" },
};

export default function PcPage() {
  return (
    <main className="shell page-shell intent-page">
      <header className="page-heading">
        <p className="soft-badge">Official Windows option</p>
        <h1>Play Color Block Jam on PC</h1>
        <p>Color Block Jam has an official Windows route through Google Play Games on PC.</p>
      </header>
      <a className="official-action" href={officialLinks.googlePlayPc} target="_blank" rel="noreferrer">
        <span>▣</span><div><strong>Open Color Block Jam on Google Play Games</strong><small>Official Google PC experience</small></div><i>↗</i>
      </a>
      <section className="content-card">
        <h2>Quick setup</h2>
        <ol className="steps-list">
          <li>Open the official Google Play Games PC page above.</li>
          <li>Install or launch Google Play Games for Windows and sign in.</li>
          <li>Choose Color Block Jam and follow Google’s installation prompts.</li>
        </ol>
      </section>
      <section className="content-card">
        <h2>Official minimum requirements</h2>
        <ul className="fact-list">
          <li>Windows 10 version 2004 or newer</li><li>SSD with 10 GB available</li>
          <li>Intel UHD Graphics 630 or comparable</li><li>Four physical CPU cores and 8 GB RAM</li>
          <li>Windows administrator account and hardware virtualization enabled</li>
        </ul>
        <p>These requirements are shown on the official Google Play Games listing and may change. Check that page before installing.</p>
      </section>
      <section className="content-card">
        <h2>What about Android emulators?</h2>
        <p>Third-party emulators exist, but this guide does not recommend one or claim that Rollic officially supports it. The verified Google Play Games route is the simplest official option.</p>
      </section>
      <div className="inline-links"><Link href="/download">Mobile downloads</Link><Link href="/levels">Level walkthroughs</Link></div>
    </main>
  );
}
