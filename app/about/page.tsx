export const metadata = {
  title: "About",
  description: "About the Color Block Jam video walkthrough library.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <main className="shell page-shell">
      <header className="page-heading">
        <p className="kicker">About this site</p>
        <h1>A direct route to the right video</h1>
      </header>
      <section className="content-card">
        <h2>What we publish</h2>
        <p>
          The library lists only levels that can be matched to a public
          walkthrough video. We do not invent written steps, difficulty
          ratings, fastest-solution claims, or version details.
        </p>
      </section>
      <section className="content-card">
        <h2>Attribution</h2>
        <p>
          Videos are embedded from YouTube and remain under the ownership of
          their respective creators. This site does not download, edit, or
          re-host those videos.
        </p>
      </section>
    </main>
  );
}
