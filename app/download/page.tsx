import Link from "next/link";
import { officialLinks } from "@/lib/official-links";

export const metadata = {
  title: "Download Color Block Jam for iOS and Android",
  description: "Use the official App Store and Google Play links to download Color Block Jam.",
  alternates: { canonical: "/download" },
};

export default function DownloadPage() {
  return (
    <main className="shell page-shell intent-page">
      <header className="page-heading">
        <p className="soft-badge">Official store links</p>
        <h1>Download Color Block Jam</h1>
        <p>Color Block Jam is free to download on iPhone, iPad and Android. The official listings disclose optional in-app purchases; Google Play also lists ads.</p>
      </header>
      <div className="download-grid">
        <a className="download-card ios-card" href={officialLinks.appStore} target="_blank" rel="noreferrer">
          <span aria-hidden="true">●</span><div><small>Download on the</small><strong>Official App Store</strong><p>For iPhone and iPad</p></div><i>↗</i>
        </a>
        <a className="download-card android-card" href={officialLinks.googlePlay} target="_blank" rel="noreferrer">
          <span aria-hidden="true">▶</span><div><small>Get it on</small><strong>Official Google Play</strong><p>For Android devices</p></div><i>↗</i>
        </a>
      </div>
      <section className="content-card">
        <h2>Download safely</h2>
        <p>Use the official store pages above so the app, updates and purchase information come from Apple or Google. This site does not host installation files, APKs, modified apps or cracked versions.</p>
        <p>Want a larger screen? See the <Link className="text-link" href="/play-on-pc">official PC option</Link>. Looking for a browser version? Read <Link className="text-link" href="/play-online">can you play online?</Link></p>
      </section>
      <Link className="center-link" href="/levels">Browse Color Block Jam level walkthroughs →</Link>
    </main>
  );
}
