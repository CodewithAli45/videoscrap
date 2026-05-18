import { NextResponse } from 'next/server';
import { getHistory } from '@/lib/db';

export async function GET() {
  try {
    const history = await getHistory();
    
    // Map database models to expected output structure
    const data = history.map((item) => ({
      job_id: item.job_id,
      title: item.title,
      status: item.status,
      percent: item.percent,
      created_at: item.created_at,
      direct_url: item.status === 'completed' ? `/api/proxy_download/${item.job_id}` : null
    }));

    return NextResponse.json({ history: data });
  } catch (err: any) {
    console.error('API /api/history error:', err);
    return NextResponse.json({ error: err.message || 'An unexpected error occurred.' }, { status: 500 });
  }
}
