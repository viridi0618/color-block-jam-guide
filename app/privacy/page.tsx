export const metadata = {
  title: "Privacy",
  description: "Privacy information for the Color Block Jam Guide.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <main className="shell page-shell">
      <header className="page-heading">
        <p className="kicker">Privacy</p>
        <h1>A small site with a small data footprint</h1>
      </header>
      <section className="content-card">
        <p>
          This first version has no accounts, comments, email collection,
          personalized recommendations, or advertising. Embedded YouTube
          players use YouTube&apos;s privacy-enhanced domain.
        </p>
      </section>
    </main>
  );
}
