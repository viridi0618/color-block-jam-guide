import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { siteUrl } from "@/lib/site-url";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Color Block Jam Level Walkthroughs & Solutions",
    template: "%s | Color Block Jam Guide",
  },
  description:
    "Find Color Block Jam level walkthrough videos by level number.",
  openGraph: {
    type: "website",
    siteName: "Color Block Jam Guide",
    title: "Color Block Jam Level Walkthroughs & Solutions",
    description:
      "Find the level you need and watch a matched walkthrough video.",
    images: ["/og.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Color Block Jam Level Walkthroughs & Solutions",
    description:
      "Find the level you need and watch a matched walkthrough video.",
    images: ["/og.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#fffaf0",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <div className="shell header-inner">
            <Link href="/" className="brand" aria-label="Color Block Jam Guide home">
              <span className="brand-mark" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
              <span>BlockJam</span>
              <small>Guide</small>
            </Link>
            <nav aria-label="Main navigation">
              <Link href="/">Home</Link>
              <Link href="/levels">All levels</Link>
              <Link href="/about">About</Link>
            </nav>
          </div>
        </header>
        {children}
        <footer className="site-footer">
          <div className="shell footer-inner">
            <div>
              <Link href="/" className="brand footer-brand">
                <span className="brand-mark" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </span>
                <span>BlockJam</span>
                <small>Guide</small>
              </Link>
              <p>
                An unofficial, fan-made walkthrough index for Color Block Jam.
              </p>
            </div>
            <div className="footer-links">
              <Link href="/levels">All levels</Link>
              <Link href="/about">About</Link>
              <Link href="/privacy">Privacy</Link>
            </div>
          </div>
          <div className="shell footer-legal">
            Videos remain the property of their respective creators.
          </div>
        </footer>
      </body>
    </html>
  );
}
