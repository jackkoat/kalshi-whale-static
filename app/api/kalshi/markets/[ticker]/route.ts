import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const KALSHI_API_BASE = 'https://api.elections.kalshi.com/trade-api/v2';

export async function GET(
  request: Request,
  { params }: { params: { ticker: string } }
) {
  const ticker = params.ticker;

  const responseHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  if (!ticker) {
    return NextResponse.json(
      { message: 'Market ticker is required' }, 
      { status: 400, headers: responseHeaders }
    );
  }

  try {
    // This is the smart logic from your friend's repo.
    // First, try to get it as a MARKET
    let apiResponse = await fetch(`${KALSHI_API_BASE}/markets/${ticker}`, {
      headers: { 'Accept': 'application/json' },
    });

    if (apiResponse.ok) {
      const data = await apiResponse.json();
      return NextResponse.json(data, { headers: responseHeaders });
    }

    // If that fails (status 404), it might be an EVENT ticker
    if (apiResponse.status === 404) {
      console.warn(`Market ticker ${ticker} not found, trying as event ticker...`);
      apiResponse = await fetch(`${KALSHI_API_BASE}/events/${ticker}`, {
        headers: { 'Accept': 'application/json' },
      });

      if (apiResponse.ok) {
        const data = await apiResponse.json();
        return NextResponse.json(data, { headers: responseHeaders });
      }
    }

    // If both attempts fail
    const errorText = await apiResponse.text();
    return NextResponse.json(
      { message: `Failed to fetch data for ticker ${ticker}`, error: errorText },
      { status: apiResponse.status, headers: responseHeaders }
    );

  } catch (error: any) {
    console.error(`Proxy API Error (/api/kalshi/market/${ticker}):`, error);
    return NextResponse.json(
      { message: 'Internal Server Error', error: error.message },
      { status: 500, headers: responseHeaders }
    );
  }
}