// [File: jackkoat/kalshi-whale-static/kalshi-whale-static-ce6fa31b95bb04922b4ef890c9d7751204301a3d/app/api/kalshi/market/[ticker]/route.ts]
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const KALSHI_API_BASE = 'https://api.elections.kalshi.com/trade-api/v2';

const ALLOWED_TICKER_PREFIXES = [
  'KXBTC',
  'KXETH',
  'KXSOL',
  'KXCRYPTO', 
  'KXBCH',
  'KXADA',
  'KXMATIC',
  'KXDOT',
  'KXLINK',
  'KXLTC',
  'KXXRP',
];


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

  const isAllowed = ALLOWED_TICKER_PREFIXES.some(prefix => 
    ticker.startsWith(prefix)
  );

  if (!isAllowed) {
    return NextResponse.json(
      { message: `Ticker ${ticker} is not a relevant crypto market.` },
      { status: 422, headers: responseHeaders } // 422 Unprocessable Entity
    );
  }

  try {
    const apiResponse = await fetch(`${KALSHI_API_BASE}/markets/${ticker}`, {
      headers: { 'Accept': 'application/json' },
    });

    if (apiResponse.ok) {
      const data = await apiResponse.json();
      return NextResponse.json(data, { headers: responseHeaders });
    }

    // We keep the logic from before (no event fallback).
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