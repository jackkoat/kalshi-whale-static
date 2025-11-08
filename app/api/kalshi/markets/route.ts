import { NextResponse } from 'next/server';
import { Market } from '@/types'; 

export const dynamic = 'force-dynamic';

const KALSHI_API_URL = 'https://api.elections.kalshi.com/trade-api/v2/markets';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const params = new URLSearchParams(url.search);

    const status = params.get('status') || 'open';
    const limit = params.get('limit') || '1000';

    const apiResponse = await fetch(
      `${KALSHI_API_URL}?status=${status}&limit=${limit}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      }
    );

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      console.error('Kalshi API Error:', errorText);
      return NextResponse.json(
        { message: 'Failed to fetch from Kalshi API', error: errorText },
        { status: apiResponse.status }
      );
    }

    const data = await apiResponse.json();

    const cryptoKeywords = ["btc", "eth", "crypto", "bitcoin", "ethereum", "sol", "bch"];

    const filteredMarkets = data.markets.filter((market: Market) => {
      const ticker = market.ticker_symbol?.toLowerCase() || '';
      const title = market.title?.toLowerCase() || '';
      return cryptoKeywords.some(keyword => ticker.includes(keyword) || title.includes(keyword));
    });

    return NextResponse.json({
      ...data,
      markets: filteredMarkets,
      count: filteredMarkets.length
    });

  } catch (error: any) {
    console.error('Proxy API Error:', error);
    return NextResponse.json(
      { message: 'Internal Server Error', error: error.message },
      { status: 500 }
    );
  }
}