import { NextRequest, NextResponse } from 'next/server';
import { clearAllDbJobs } from '@/lib/db';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();
    
    if (password !== '1995') {
      return NextResponse.json({ error: 'Incorrect Password' }, { status: 401 });
    }

    // 1. Clear database
    await clearAllDbJobs();

    // 2. Clear downloads folder if it exists
    const downloadsDir = path.resolve(process.cwd(), 'downloads');
    let clearedCount = 0;
    
    if (fs.existsSync(downloadsDir)) {
      try {
        const files = fs.readdirSync(downloadsDir);
        for (const file of files) {
          const filePath = path.join(downloadsDir, file);
          if (fs.statSync(filePath).isFile()) {
            fs.unlinkSync(filePath);
            clearedCount++;
          }
        }
      } catch (dirErr) {
        console.error('Failed to read or clean downloads directory:', dirErr);
      }
    }

    return NextResponse.json({
      message: `History cleared and ${clearedCount} local files removed successfully.`
    });
  } catch (err: any) {
    console.error('API /api/admin/clear-history error:', err);
    return NextResponse.json({ error: err.message || 'An unexpected error occurred.' }, { status: 500 });
  }
}
