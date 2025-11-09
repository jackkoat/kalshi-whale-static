import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const KALSHI_API_URL = 'https://api.elections.kalshi.com/trade-api/v2/markets/trades';

export async function GET(request: Request) {
  const responseHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  if (request.method === 'OPTIONS') {
    return new NextResponse(null, { status: 200, headers: responseHeaders });
  }

  try {
    const url = new URL(request.url);
    const params = new URLSearchParams(url.search);
    const limit = params.get('limit') || '100';
    
    const cursor = params.get('cursor');

    let kalshiUrl = `${KALSHI_API_URL}?limit=${limit}`;

    if (cursor) {
      kalshiUrl += `&cursor=${cursor}`;
    }

    const apiResponse = await fetch(kalshiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      return NextResponse.json(
        { message: 'Failed to fetch trades from Kalshi API', error: errorText },
        { status: apiResponse.status, headers: responseHeaders }
      );
    }

    const data = await apiResponse.json();
    return NextResponse.json(data, { headers: responseHeaders });

  } catch (error: any) {
    console.error('Proxy API Error (/api/kalshi/trades):', error);
    return NextResponse.json(
      { message: 'Internal Server Error', error: error.message },
      { status: 500, headers: responseHeaders }
    );
  }
}