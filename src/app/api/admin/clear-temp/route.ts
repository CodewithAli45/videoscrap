import { NextRequest, NextResponse } from 'next/server';
import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { getYtdlpPath } from '@/lib/ytdlp';

const execFilePromise = promisify(execFile);

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();
    
    if (password !== '1995') {
      return NextResponse.json({ error: 'Incorrect Password' }, { status: 401 });
    }

    try {
      const { stdout: cacheStdout } = await execFilePromise(getYtdlpPath(), ['--rm-cache-dir']);
      
      // 2. Clear temp files in local root
      const tempExtensions = ['.part', '.ytdl', '.temp'];
      const rootDir = process.cwd();
      let clearedCount = 0;
      
      const files = fs.readdirSync(rootDir);
      for (const file of files) {
        if (tempExtensions.some(ext => file.endsWith(ext))) {
          const filePath = path.join(rootDir, file);
          try {
            if (fs.statSync(filePath).isFile()) {
              fs.unlinkSync(filePath);
              clearedCount++;
            }
          } catch (e) {
            console.error(`Failed to delete temp file ${filePath}:`, e);
          }
        }
      }

      return NextResponse.json({
        message: `Cache cleared successfully. ${clearedCount} temporary files removed.`,
        cache_output: cacheStdout
      });
    } catch (execErr: any) {
      console.error('yt-dlp clear-cache error:', execErr);
      return NextResponse.json({ error: `Cache clearing failed: ${execErr.message}` }, { status: 500 });
    }
  } catch (err: any) {
    console.error('API /api/admin/clear-temp error:', err);
    return NextResponse.json({ error: err.message || 'An unexpected error occurred.' }, { status: 500 });
  }
}
