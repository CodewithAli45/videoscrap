import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();
    
    if (password !== '1995') {
      return NextResponse.json({ error: 'Incorrect Password' }, { status: 401 });
    }

    return NextResponse.json({
      message: `Session download history cleared successfully.`
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'An unexpected error occurred.' }, { status: 500 });
  }
}
