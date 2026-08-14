import type { Metadata } from "next";
import "./globals.css";

const SITE_URL = "https://downloader.loveonthe.cloud";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Online Video Downloader — YouTube | TikTok | Instagram Reels",
    template: "%s | Online Video Downloader",
  },
  description:
    "Download videos from YouTube, TikTok and Instagram Reels. Paste a URL, pick a quality, download.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "Online Video Downloader",
    title: "Online Video Downloader — YouTube | TikTok | Instagram Reels",
    description:
      "Download videos from YouTube, TikTok and Instagram Reels. Paste a URL, pick a quality, download.",
  },
  twitter: {
    card: "summary",
    title: "Online Video Downloader — YouTube | TikTok | Instagram Reels",
    description:
      "Download videos from YouTube, TikTok and Instagram Reels. Paste a URL, pick a quality, download.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Online Video Downloader",
    url: SITE_URL,
    description:
      "Download videos from YouTube, TikTok and Instagram Reels. Paste a URL, pick a quality, download.",
    applicationCategory: "UtilityApplication",
    operatingSystem: "Any",
  };

  return (
    <html lang="en" className="light">
      <head>
        {/* Fonts — same as the mockups: Material Symbols icons + Inter */}
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="bg-surface text-on-surface font-body-md antialiased">
        {children}
      </body>
    </html>
  );
}
