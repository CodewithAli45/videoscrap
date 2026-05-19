import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const directUrl = searchParams.get('url');
    const title = searchParams.get('title') || 'video';
    const ext = searchParams.get('ext') || 'mp4';

    if (!directUrl) {
      return NextResponse.json({ error: 'Direct URL is required' }, { status: 400 });
    }

    // Fetch the raw video stream from the provider's direct URL
    const response = await fetch(directUrl);

    if (!response.ok) {
      return NextResponse.json({ error: `Failed to fetch video stream: ${response.statusText}` }, { status: 500 });
    }

    // Prepare attachment filename
    const cleanTitle = title.replace(/[^\w\s.-]/gi, '_');
    const filename = `${cleanTitle}.${ext}`;

    const headers = new Headers();
    headers.set('Content-Type', response.headers.get('Content-Type') || 'video/mp4');
    headers.set('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    
    // Support streaming download chunks straight to the browser download folder on-the-fly!
    return new NextResponse(response.body, {
      headers
    });

  } catch (err: any) {
    console.error('Stateless stream proxy error:', err);
    return NextResponse.json({ error: err.message || 'Streaming failed.' }, { status: 500 });
  }
}
