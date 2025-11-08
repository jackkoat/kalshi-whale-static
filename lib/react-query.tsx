'use client'

import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import React, { useState, useEffect, useRef } from 'react'
import { MarketsResponse, WhaleAlertsResponse, WebSocketMessage, WhaleAlertsData, Market, WhaleSignal } from '../types'
import { useAppStore } from '../store'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 minutes
      refetchOnWindowFocus: true,
    },
  },
})

export function QueryProvider({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Failed to fetch: ${res.statusText}`)
  }
  return res.json()
}

// This is the new, aligned, high-performance hook.
export function useAlignedMarkets() {
  return useQuery({
    queryKey: ['alignedMarkets'],
    queryFn: async () => {
      // 1. Fetch the "Just In" trades (Channel 1)
      const tradeData = await fetcher('/api/kalshi/trades?limit=1000');
      const trades = tradeData.trades || [];

      // 2. Find all unique market tickers from those trades
      const marketTickers = [...new Set(trades.map((trade: any) => trade.ticker))];

      // 3. Fetch the "Alignment" data for each unique ticker
      const marketInfoPromises = marketTickers.map(ticker => 
        fetcher(`/api/kalshi/market/${ticker}`)
      );
      
      const marketInfoResults = await Promise.allSettled(marketInfoPromises);

      // 4. Create a "cache" (a simple map) for easy lookup
      const marketInfoCache = new Map();
      marketInfoResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          const ticker = marketTickers[index] as string;
          const marketData = result.value.market || result.value.event;
          marketInfoCache.set(ticker, marketData);
        }
      });

      // 5. "Align" the data: Combine trades with market titles
      const alignedMarkets = trades.map((trade: any) => {
        const marketDetails = marketInfoCache.get(trade.ticker);
        return {
          ...trade, // The trade data (price, quantity, time)
          ...marketDetails, // The clean data (title, category)
          id: trade.id || `${trade.ticker}-${trade.created_time}`
        };
      });

      // 6. Group trades into "Markets" for our dashboard
      const marketsMap = new Map<string, Market>();
      
      for (const alignedTrade of alignedMarkets) {
        if (!marketsMap.has(alignedTrade.ticker)) {
          // This is the first time we see this market, create its entry
          marketsMap.set(alignedTrade.ticker, {
            id: alignedTrade.market_id || alignedTrade.ticker,
            question: alignedTrade.title || "Unknown Title",
            title: alignedTrade.title || "Unknown Title",
            category: alignedTrade.category_name || "Crypto",
            ticker_symbol: alignedTrade.ticker,
            last_price: alignedTrade.price,
            volume: alignedTrade.volume,
            last_update: alignedTrade.created_time,
            expiration_time: alignedTrade.expiration_time || '',
            yes_sub_title: alignedTrade.yes_sub_title || 'YES',
            no_sub_title: alignedTrade.no_sub_title || 'NO',
            cadence: alignedTrade.frequency || 'N/A',
            status: alignedTrade.status || 'open',
            event_ticker: alignedTrade.event_ticker || '',
            open_time: alignedTrade.open_time || '',
            close_time: alignedTrade.close_time || '',
            outcomes: [], 
            high_volume: (alignedTrade.price * alignedTrade.quantity) > 100000, // Real whale check
            trending: true,
            high_liquidity: true,
            recent: true,
            yes_bid_dollars: alignedTrade.yes_bid_dollars,
            no_bid_dollars: alignedTrade.no_bid_dollars,
          });
        } else {
          // Market already exists, just add to its volume
          const existingMarket = marketsMap.get(alignedTrade.ticker)!;
          existingMarket.volume += alignedTrade.quantity;
          if (existingMarket.volume > 100000) {
            existingMarket.high_volume = true;
          }
        }
      }

      const finalMarkets = Array.from(marketsMap.values());
      
      // Filter *again* for crypto keywords, just to be safe
      const cryptoKeywords = ["btc", "eth", "crypto", "bitcoin", "ethereum", "sol", "bch"];
      const filteredCryptoMarkets = finalMarkets.filter(market => {
        const ticker = market.ticker_symbol?.toLowerCase() || '';
        const title = market.title?.toLowerCase() || '';
        return cryptoKeywords.some(keyword => ticker.includes(keyword) || title.includes(keyword));
      });

      return {
        markets: filteredCryptoMarkets,
        count: filteredCryptoMarkets.length,
        timestamp: new Date().toISOString()
      } as MarketsResponse;
    }
  });
}

// We still keep these original hook names so our Dashboard component doesn't break
export function useMarkets() {
  return useAlignedMarkets();
}

// This hook now uses the *real* "high_volume" flag we just calculated
export function useWhaleAlerts() {
  const { data: marketData, ...rest } = useAlignedMarkets();

  const whaleAlerts = (marketData?.markets || [])
    .filter(m => m.high_volume) 
    .map(m => ({
      id: `hv-${m.id}`,
      type: 'volume_surge',
      ticker: m.ticker_symbol || 'N/A',
      severity: 'medium',
      confidence: 80,
      market_impact: 'high',
      data: { current_value: m.volume, growth_multiple: 3.5 },
      timestamp: m.last_update,
      description: `High volume detected on ${m.title}`
    } as WhaleSignal));

  const response: WhaleAlertsResponse = {
    data: {
      alerts: whaleAlerts,
      count: whaleAlerts.length,
      whale_signals_count: whaleAlerts.length,
      high_volume_count: whaleAlerts.length,
      detection_types: { volume_surge: true, odds_flip: false, order_book_shift: false, high_volume: true },
      thresholds: { volume_surge_multiplier: 3, odds_change_percent: 15, order_book_change_percent: 25, minimum_volume: 100000 }
    },
    timestamp: new Date().toISOString(),
    status: 'success'
  };

  return { data: response, ...rest };
}

// WebSocket is disabled for now, as we are using a REST-based Vercel proxy.
export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false)
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null)
  const ws = useRef<WebSocket | null>(null)

  const connect = (url: string) => {
    console.warn("WebSocket connection disabled in Vercel-only mode.");
    return null;
  }

  const disconnect = () => {
    if (ws.current) {
      ws.current.close()
      ws.current = null
      setIsConnected(false)
    }
  }

  return { connect, disconnect, isConnected, lastMessage }
}