import Link from "next/link";

export default function NotFound() {
  return (
    <main className="shell not-found">
      <div>
        <p className="kicker">404</p>
        <h1>This level page is not available</h1>
        <p>Try searching the verified video library instead.</p>
        <Link className="primary-button" href="/">
          Search levels
        </Link>
      </div>
    </main>
  );
}
