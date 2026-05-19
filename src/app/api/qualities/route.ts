import { NextRequest, NextResponse } from 'next/server';
import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { getYtdlpPath } from '@/lib/ytdlp';

const execFilePromise = promisify(execFile);

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Build the arguments array safely (shell-less)
    const args = ['-j', '--no-warnings', '--no-playlist', '--ignore-config'];
    
    // Check if cookies.txt exists in root directory
    const cookiesPath = path.resolve(/*turbopackIgnore: true*/ process.cwd(), 'cookies.txt');
    if (fs.existsSync(cookiesPath)) {
      args.push('--cookies', cookiesPath);
    }
    
    // Append the URL as final argument
    args.push(url);

    try {
      const { stdout } = await execFilePromise(getYtdlpPath(), args, { maxBuffer: 10 * 1024 * 1024 }); // 10MB buffer

      const info = JSON.parse(stdout);
      
      const thumbnail = info.thumbnail || null;
      const title = info.title || 'video';
      
      const formats: any[] = [];
      if (info.formats && Array.isArray(info.formats)) {
        for (const f of info.formats) {
          // Look for formats that have a video codec (vcodec != 'none')
          if (f.vcodec && f.vcodec !== 'none') {
            const label = f.format_note || `${f.height}p` || f.format_id;
            formats.push({
              id: f.format_id,
              label: `${label} (${f.ext || 'mp4'})`,
              height: f.height || 0,
              ext: f.ext || 'mp4',
              url: f.url || info.url || null
            });
          }
        }
      }

      // Remove duplicates and sort by height descending
      const seen = new Set();
      const uniqueFormats = [];
      for (const fmt of formats) {
        if (!seen.has(fmt.id)) {
          uniqueFormats.push(fmt);
          seen.add(fmt.id);
        }
      }
      uniqueFormats.sort((a, b) => b.height - a.height);

      return NextResponse.json({
        title,
        thumbnail,
        qualities: uniqueFormats
      });
    } catch (execErr: any) {
      console.error('yt-dlp execution error:', execErr);
      return NextResponse.json({ error: execErr.message || 'Failed to extract video information.' }, { status: 500 });
    }
  } catch (err: any) {
    console.error('API /api/qualities error:', err);
    return NextResponse.json({ error: err.message || 'An unexpected error occurred.' }, { status: 500 });
  }
}
