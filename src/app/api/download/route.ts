import { NextRequest, NextResponse } from 'next/server';
import { execFile } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { addJob, updateJobProgress } from '@/lib/db';
import { getYtdlpPath } from '@/lib/ytdlp';

export async function POST(req: NextRequest) {
  try {
    const { url, quality_id, title, thumbnail } = await req.json();

    if (!url || !quality_id) {
      return NextResponse.json({ error: 'URL and quality_id are required' }, { status: 400 });
    }

    const job_id = crypto.randomUUID();
    const finalTitle = title || 'video';
    const finalThumbnail = thumbnail || '';

    // Add job to database with status 'processing' and 10% progress
    await addJob({
      job_id,
      url,
      title: finalTitle,
      thumbnail: finalThumbnail,
      status: 'processing',
      file_path: '' // Will store the direct URL or format ID here
    });
    
    await updateJobProgress(job_id, 10, 'processing');

    // Run the yt-dlp extraction in the background (detached / asynchronous)
    // We will get the direct download URL
    const runTask = async () => {
      try {
        const args = ['-g', '-f', quality_id, '--ignore-config'];
        
        // Append cookies if present
        const cookiesPath = path.resolve(/*turbopackIgnore: true*/ process.cwd(), 'cookies.txt');
        if (fs.existsSync(cookiesPath)) {
          args.push('--cookies', cookiesPath);
        }
        
        // Append URL
        args.push(url);

        // Update to 50% progress
        await updateJobProgress(job_id, 50, 'processing');

        execFile(getYtdlpPath(), args, { maxBuffer: 10 * 1024 * 1024 }, async (error, stdout, stderr) => {
          if (error) {
            console.error(`yt-dlp error for job ${job_id}:`, error);
            await updateJobProgress(job_id, 0, 'failed', undefined, error.message || 'Failed to fetch direct URL.');
            return;
          }

          const directUrl = stdout.trim();
          if (!directUrl) {
            await updateJobProgress(job_id, 0, 'failed', undefined, 'No direct URL returned.');
            return;
          }

          // Complete the job, storing the direct URL in file_path and the quality_id in error (so we know which quality was used if we need to regenerate)
          await updateJobProgress(job_id, 100, 'completed', directUrl, quality_id);
        });
      } catch (err: any) {
        console.error(`Background task exception for job ${job_id}:`, err);
        await updateJobProgress(job_id, 0, 'failed', undefined, err.message || 'Failed in background task.');
      }
    };

    // Trigger the background task without awaiting it
    runTask();

    return NextResponse.json({
      id: job_id,
      message: 'Download process initiated'
    });

  } catch (err: any) {
    console.error('API /api/download error:', err);
    return NextResponse.json({ error: err.message || 'An unexpected error occurred.' }, { status: 500 });
  }
}
