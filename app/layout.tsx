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
    locale: "en_US",
    siteName: "Color Block Jam Guide",
    images: ["/og-v2.png"],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/og-v2.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#fffafd",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700&family=Nunito:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>
        <header className="site-header">
          <div className="shell header-inner">
            <Link href="/" className="brand" aria-label="Color Block Jam Guide home">
              <span className="brand-mark" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
              <span>Color Block Jam</span>
              <small>Level Guide</small>
            </Link>
            <nav aria-label="Main navigation">
              <Link href="/levels">All Levels</Link>
              <Link href="/play-online">Play Online</Link>
              <Link href="/#find-level" className="header-find">Find a Level</Link>
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
                <span>Color Block Jam</span>
                <small>Level Guide</small>
              </Link>
              <p className="footer-disclaimer">
                This is an unofficial fan-made walkthrough index for Color Block Jam and is
                not affiliated with Rollic Games. Videos remain the property of their
                respective creators.
              </p>
            </div>
            <div className="footer-links">
              <Link href="/">Color Block Jam Level Walkthroughs</Link>
              <Link href="/levels">Browse All Color Block Jam Levels</Link>
              <Link href="/play-online">Play Color Block Jam Online</Link>
              <Link href="/privacy">Privacy</Link>
            </div>
          </div>
          </footer>
      </body>
    </html>
  );
}