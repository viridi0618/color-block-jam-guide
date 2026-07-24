import Link from "next/link";

export const metadata = {
  title: "Color Block Jam FAQ",
  description: "Short answers about Color Block Jam platforms, price, developer and level walkthroughs.",
  alternates: { canonical: "/faq" },
};

const questions = [
  { q: "Is Color Block Jam free?", a: "Yes. The official App Store and Google Play listings offer it as a free download with optional in-app purchases. Google Play also lists ads." },
  { q: "Is Color Block Jam available on iOS?", a: "Yes. The official App Store listing supports iPhone and iPad." },
  { q: "Is Color Block Jam available on Android?", a: "Yes. The official Android app is listed on Google Play under Rollic Games." },
  { q: "Can I play Color Block Jam on PC?", a: "Yes. Google Play Games provides an official Windows PC version for compatible computers." },
  { q: "Is there an official browser version?", a: "We did not find a verified official browser version on the official publisher and store pages checked on July 24, 2026." },
  { q: "Who developed Color Block Jam?", a: "The official App Store and Google Play listings name Rollic Games." },
  { q: "Why does my level look different from a walkthrough video?", a: "Game updates can change level numbering or layouts. Some creator titles also include two explicit level numbers for different versions." },
  { q: "Where can I find a specific level walkthrough?", a: "Use the level search on the homepage or browse All Levels. A page is published only when a title-matched video is available." },
];

export default function FaqPage() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: questions.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };
  return (
    <main className="shell page-shell intent-page">
      <header className="page-heading"><p className="soft-badge">Quick help</p><h1>Color Block Jam FAQ</h1><p>Short answers based on official store and publisher information.</p></header>
      <div className="faq-list">
        {questions.map((item) => <section className="faq-item" key={item.q}><h2>{item.q}</h2><p>{item.a}</p></section>)}
      </div>
      <div className="inline-links"><Link href="/download">Download details</Link><Link href="/play-on-pc">PC guide</Link><Link href="/play-online">Online availability</Link><Link href="/about-color-block-jam">About the game</Link></div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
    </main>
  );
}
