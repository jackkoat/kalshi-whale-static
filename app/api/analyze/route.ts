import { NextResponse } from 'next/server';
import { Market } from '@/types';
import { getAIAnalysis } from '@/lib/llmService';

export async function POST(request: Request) {
  const openRouterApiKey = process.env.OPENROUTER_API_KEY;

  if (!openRouterApiKey) {
    return NextResponse.json(
      { message: 'OpenRouter API key is not configured' },
      { status: 500 }
    );
  }

  try {
    const market = (await request.json()) as Market;

    if (!market || !market.id) {
      return NextResponse.json(
        { message: 'Invalid market data provided' },
        { status: 400 }
      );
    }

    const analysis = await getAIAnalysis(market, openRouterApiKey);
    
    return NextResponse.json(analysis);

  } catch (error: any) {
    console.error('Analysis API Error:', error);
    return NextResponse.json(
      { message: 'Internal Server Error', error: error.message },
      { status: 500 }
    );
  }
}