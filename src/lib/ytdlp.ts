import fs from 'fs';
import path from 'path';

/**
 * Robust utility to locate the most up-to-date yt-dlp binary path,
 * prioritizing user local path (~/.local/bin/yt-dlp) to bypass outdated system packages.
 */
export function getYtdlpPath(): string {
  // Prioritize user local install where the updated version is stored
  const userLocalPath = '/home/ali-murtaza/.local/bin/yt-dlp';
  if (fs.existsSync(userLocalPath)) {
    return userLocalPath;
  }

  // Common alternate fallback paths
  const alternativePaths = [
    '/usr/local/bin/yt-dlp',
    '/usr/bin/yt-dlp',
    path.resolve(/*turbopackIgnore: true*/ process.cwd(), 'yt-dlp')
  ];

  for (const p of alternativePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }

  // Fallback to system env resolving
  return 'yt-dlp';
}
