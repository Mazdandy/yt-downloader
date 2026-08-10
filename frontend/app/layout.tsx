import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Online Video Downloader — YouTube | TikTok | Instagram Reels",
  description:
    "Download videos from YouTube, TikTok and Instagram Reels. Paste a URL, pick a quality, download.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
