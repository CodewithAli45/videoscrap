import { NextRequest, NextResponse } from 'next/server';
import { getJob } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Job ID is required' }, { status: 400 });
    }

    const job = await getJob(id);
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: job.job_id,
      status: job.status === 'completed' ? 'Ready' : (job.status === 'processing' ? 'Fetching direct link...' : job.status),
      percent: job.percent,
      done: job.status === 'completed' || job.status === 'failed',
      direct_url: job.status === 'completed' ? `/api/proxy_download/${job.job_id}` : null,
      error: job.error
    });
  } catch (err: any) {
    console.error('API /api/progress/[id] error:', err);
    return NextResponse.json({ error: err.message || 'An unexpected error occurred.' }, { status: 500 });
  }
}
