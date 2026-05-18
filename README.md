# Video Downloader - Full Stack Next.js App

A beautiful, premium, full-stack video downloader for extracting and saving videos from various platforms (YouTube, Facebook, etc.) built with Next.js, React, Vanilla CSS, and SQLite.

## Features
- **Premium UI**: Pixel-perfect design matching custom visual mockups, styled with vanilla CSS and elegant Outfit typography.
- **Asynchronous Processing**: Background direct link scraping using `yt-dlp` CLI.
- **SQLite Database**: Full historical database that persists scraped videos in the "Recent Downloads" list.
- **Everlasting CDN Streams**: Automatically refreshes direct download links dynamically so they never expire when clicked.
- **Password Protection**: Admin features (`Update yt-dlp`, `Clear Cache/Temp`, and `Clear History`) are password protected with password `"1995"`.

## Prerequisites
- Node.js (v18.0.0 or higher)
- npm or yarn
- `yt-dlp` installed on system path

## Setup Instructions

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Run Development Server**
   ```bash
   npm run dev
   ```
   Open your browser and navigate to: [http://localhost:3000](http://localhost:3000)

3. **Build and Start Production Mode**
   ```bash
   npm run build
   ```
   ```bash
   npm start
   ```

