import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return new NextResponse('Proxy download is stateless now. Use /api/download route.', { status: 200 });
}
