import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();
    
    if (password !== '1995') {
      return NextResponse.json({ error: 'Incorrect Password' }, { status: 401 });
    }

    try {
      // Execute pip update
      const { stdout } = await execPromise('pip3 install --upgrade yt-dlp --break-system-packages');
      console.log('yt-dlp update output:', stdout);
      return NextResponse.json({ message: 'yt-dlp updated successfully', output: stdout });
    } catch (execErr: any) {
      console.error('yt-dlp update error:', execErr);
      return NextResponse.json({ error: `Update failed: ${execErr.message}` }, { status: 500 });
    }
  } catch (err: any) {
    console.error('API /api/admin/update error:', err);
    return NextResponse.json({ error: err.message || 'An unexpected error occurred.' }, { status: 500 });
  }
}
