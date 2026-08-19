import type { Metadata } from "next";
import "./globals.css";
import {
  PLATFORM_DESCRIPTION,
  PLATFORM_TITLE,
} from "../lib/platforms";

const SITE_URL = "https://downloader.loveonthe.cloud";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `LOTC - Video Downloader — ${PLATFORM_TITLE}`,
    template: "%s | LOTC - Video Downloader",
  },
  description: `Download videos from ${PLATFORM_DESCRIPTION}. Paste a URL, pick a quality, download.`,
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: "/icon-512.png", sizes: "512x512", type: "image/png" }],
  },
  manifest: "/manifest.webmanifest",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "LOTC - Video Downloader",
    title: `LOTC - Video Downloader — ${PLATFORM_TITLE}`,
    description: `Download videos from ${PLATFORM_DESCRIPTION}. Paste a URL, pick a quality, download.`,
  },
  twitter: {
    card: "summary",
    title: `LOTC - Video Downloader — ${PLATFORM_TITLE}`,
    description: `Download videos from ${PLATFORM_DESCRIPTION}. Paste a URL, pick a quality, download.`,
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
    name: "LOTC - Video Downloader",
    url: SITE_URL,
    description: `Download videos from ${PLATFORM_DESCRIPTION}. Paste a URL, pick a quality, download.`,
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
      <body className="bg-surface text-on-surface font-body-md antialiased min-h-screen flex flex-col overflow-x-hidden relative">
        {children}
      </body>
    </html>
  );
}
