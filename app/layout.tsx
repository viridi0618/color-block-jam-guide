import type { Metadata, Viewport } from "next";
import Script from "next/script";
import Link from "next/link";
import { siteUrl } from "@/lib/site-url";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "16x16" },
      { url: "/favicon.png", sizes: "32x32" },
    ],
  },
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
        <meta name="google-site-verification" content="google70d2f5ada7903a5f.html" />
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
        <Script
          strategy="afterInteractive"
          src="https://www.googletagmanager.com/gtag/js?id=G-ZB78Q21ZX9"
        />
        <Script
          id="gtag-init"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-ZB78Q21ZX9');
            `,
          }}
        />
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
          <div className="directory-badges" style={{ marginTop: "12px", display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center", justifyContent: "center" }}>
            <a href="https://artificin.com?utm_source=badge&utm_medium=referral&utm_campaign=featured_badge" target="_blank" rel="noopener"><img src="https://artificin.com/badges/Artificin-badge.png" alt="Featured on Artificin" style={{ border: "none", width: "175px", height: "50px" }} /></a>
            <a href="https://findly.tools/color-block-jam?utm_source=color-block-jam" target="_blank" rel="noopener noreferrer"><img src="https://findly.tools/badges/findly-tools-badge-light.svg" alt="Featured on Findly.tools" width="150" /></a>
            <a href="https://startupfa.me/s/color-block-jam-1?utm_source=colorblockjam.wiki" target="_blank" rel="noopener noreferrer"><img src="https://startupfa.me/badges/featured/default-small-rounded.webp" alt="Color Block Jam - Featured on Startup Fame" width="240" height="37" /></a>
          </div>
          </footer>
      </body>
    </html>
  );
}