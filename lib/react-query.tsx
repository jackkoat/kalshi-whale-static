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

const cryptoKeywords = [
    "btc", "eth", "crypto", "bitcoin", "ethereum", 
    "sol", "solana", "bch", "ada", "cardano", "matic", 
    "polygon", "dot", "polkadot", "link", "chainlink",
    "ltc", "litecoin", "xrp"
];

export function useAlignedMarkets() {
  return useQuery({
    queryKey: ['alignedMarkets'],

    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false, 

    queryFn: async () => {
      const tradeData = await fetcher('/api/kalshi/trades?limit=1000');
      const trades = tradeData.trades || [];

      const marketTickers = [...new Set(trades.map((trade: any) => trade.ticker))];

      const marketInfoPromises = marketTickers.map(ticker => 
        fetcher(`/api/kalshi/market/${ticker}`)
      );
      
      const marketInfoResults = await Promise.allSettled(marketInfoPromises);

      const marketInfoCache = new Map();
      marketInfoResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          const ticker = marketTickers[index] as string;
          const marketData = result.value.market || result.value.event;
          marketInfoCache.set(ticker, marketData);
        }
      });

      const alignedMarkets = trades.map((trade: any) => {
        const marketDetails = marketInfoCache.get(trade.ticker);
        return {
          ...trade, 
          ...marketDetails, 
          id: trade.trade_id || `${trade.ticker}-${trade.created_time}` 
        };
      });

      const marketsMap = new Map<string, Market>();
      
      for (const alignedTrade of alignedMarkets) {
        
        
        const tradeNotionalValue = (alignedTrade.count || 0) * (alignedTrade.price || 0);

        const marketNotionalVolume24h = ((alignedTrade.volume_24h || 0) * (alignedTrade.last_price || 0)) / 100;

        const isWhaleTrade = (tradeNotionalValue > 500) && 
                           (marketNotionalVolume24h > 0) && // Avoid divide by zero
                           ((tradeNotionalValue / marketNotionalVolume24h) > 0.10);

        if (!marketsMap.has(alignedTrade.ticker)) {
          marketsMap.set(alignedTrade.ticker, {
            id: alignedTrade.market_id || alignedTrade.ticker,

            question: alignedTrade.title || "Unknown Title",
            title: alignedTrade.title || "Unknown Title",
            
            category: alignedTrade.category_name || "Crypto",
            ticker_symbol: alignedTrade.ticker,
            
            last_price: alignedTrade.last_price, 
            
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
            high_volume: isWhaleTrade, 
            trending: true, // We can adjust this later
            high_liquidity: true, // We can adjust this later
            recent: true,
            yes_bid_dollars: alignedTrade.yes_bid_dollars,
            no_bid_dollars: alignedTrade.no_bid_dollars,
          });
        } else {
          // Market already exists
          const existingMarket = marketsMap.get(alignedTrade.ticker)!;
          
          existingMarket.volume += (alignedTrade.count || 0); 
          
          if (isWhaleTrade) {
            existingMarket.high_volume = true;
          }
          
          existingMarket.last_price = alignedTrade.last_price;
          existingMarket.last_update = alignedTrade.created_time;
        }
      }

      const finalMarkets = Array.from(marketsMap.values());
      
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

export function useMarkets() {
  return useAlignedMarkets();
}

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
      thresholds: { volume_surge_multiplier: 3, odds_change_percent: 15, order_book_change_percent: 25, minimum_volume: 100000 } // This is now just metadata
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