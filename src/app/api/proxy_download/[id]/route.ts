import { NextRequest, NextResponse } from 'next/server';
import { getJob } from '@/lib/db';
import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { getYtdlpPath } from '@/lib/ytdlp';

const execFilePromise = promisify(execFile);

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return new NextResponse('Job ID is required', { status: 400 });
    }

    const job = await getJob(id);
    if (!job) {
      return new NextResponse('Job not found', { status: 404 });
    }

    if (job.status !== 'completed') {
      return new NextResponse('File is not ready or download failed', { status: 400 });
    }

    let directUrl = job.file_path;
    const qualityId = job.error; // We saved quality_id in the 'error' column for completed jobs
    const originalUrl = job.url;

    // Refresh the direct URL dynamically so it never expires!
    if (qualityId && originalUrl) {
      try {
        const args = ['-g', '-f', qualityId, '--ignore-config'];
        
        // Append cookies if present
        const cookiesPath = path.resolve(/*turbopackIgnore: true*/ process.cwd(), 'cookies.txt');
        if (fs.existsSync(cookiesPath)) {
          args.push('--cookies', cookiesPath);
        }
        
        args.push(originalUrl);
        
        const { stdout } = await execFilePromise(getYtdlpPath(), args, { timeout: 8000 });
        const refreshedUrl = stdout.trim();
        if (refreshedUrl) {
          directUrl = refreshedUrl;
        }
      } catch (refreshErr) {
        console.warn('Failed to refresh direct URL, falling back to cached one:', refreshErr);
      }
    }

    if (!directUrl) {
      return new NextResponse('Direct download URL not found', { status: 404 });
    }

    // Fetch the video stream
    const videoResponse = await fetch(directUrl);
    if (!videoResponse.ok) {
      return new NextResponse(`Failed to fetch video from source: ${videoResponse.statusText}`, { status: videoResponse.status });
    }

    // Sanitize title for filename
    // Replace non-ascii or special chars
    let safeTitle = job.title.replace(/[^a-zA-Z0-9\s-_|]/g, '').trim();
    if (safeTitle.length > 80) {
      safeTitle = safeTitle.substring(0, 80) + '...';
    }
    const filename = `${safeTitle || 'video'}.mp4`;

    const headers = new Headers();
    headers.set('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    headers.set('Content-Type', videoResponse.headers.get('Content-Type') || 'video/mp4');
    
    // Transfer content length if present
    const contentLength = videoResponse.headers.get('Content-Length');
    if (contentLength) {
      headers.set('Content-Length', contentLength);
    }

    return new NextResponse(videoResponse.body, {
      status: 200,
      headers
    });

  } catch (err: any) {
    console.error('API /api/proxy_download/[id] error:', err);
    return new NextResponse(err.message || 'An unexpected error occurred during proxy download.', { status: 500 });
  }
}
