import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Video Downloader - Download High Quality Videos",
  description: "A beautiful, premium full-stack video downloader for extracting and saving videos from various platforms.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Downloader",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

