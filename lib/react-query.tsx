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
    const errorText = await res.text()
    throw new Error(`Failed to fetch: ${res.statusText} (${res.status}) - ${errorText}`)
  }
  return res.json()
}

// 1. EXPANDED CRYPTO FILTER
const cryptoKeywords = [
    "btc", "eth", "crypto", "bitcoin", "ethereum", 
    "sol", "solana", "bch", "ada", "cardano", "matic", 
    "polygon", "dot", "polkadot", "link", "chainlink",
    "ltc", "litecoin", "xrp"
];

export function useAlignedMarkets() {
  return useQuery({
    queryKey: ['alignedMarkets'],

    // 2. CACHE PERSISTENCE
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false, 

    queryFn: async () => {
      
      // 3. PAGINATION LOOP
      let allTrades: any[] = [];
      let currentCursor: string | null = null;
      const MAX_PAGES_TO_FETCH = 5; 

      console.log('Starting paginated fetch for trades...');

      for (let i = 0; i < MAX_PAGES_TO_FETCH; i++) {
        let fetchUrl = '/api/kalshi/trades?limit=1000';
        if (currentCursor) {
          fetchUrl += `&cursor=${encodeURIComponent(currentCursor)}`;
        }
        
        try {
          const tradeData = await fetcher(fetchUrl);
          if (tradeData.trades) allTrades.push(...tradeData.trades);
          if (tradeData.cursor) currentCursor = tradeData.cursor;
          else break;
        } catch (error) {
          console.error(`Error fetching trade page ${i + 1}:`, error);
          break; 
        }
      }

      console.log(`Fetched a total of ${allTrades.length} trades.`);
      const trades = allTrades; 

      // 2. Find all unique market tickers from those trades
      const marketTickers = [...new Set(trades.map((trade: any) => trade.ticker))];
      console.log(`Found ${marketTickers.length} unique tickers. Fetching market details...`);

      // 3. Fetch the "Alignment" data
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
      console.log(`Successfully fetched details for ${marketInfoCache.size} markets.`);
      
      // --- 4. NEW WHALE LOGIC (Part 1: Find Max Volume) ---
      // We must first loop through all markets to find the "leader"
      
      let maxNotionalVolume = 0;
      for (const market of marketInfoCache.values()) {
        const marketNotionalVolume24h = ((market.volume_24h || 0) * (market.last_price || 0)) / 100;
        if (marketNotionalVolume24h > maxNotionalVolume) {
          maxNotionalVolume = marketNotionalVolume24h;
        }
      }

      // Now, calculate the single threshold based on your 12.5% rule
      const whaleThreshold = maxNotionalVolume * 0.125;

      console.log(`Highest market volume (leader): $${maxNotionalVolume.toFixed(2)}`);
      console.log(`Whale detection threshold (12.5%): $${whaleThreshold.toFixed(2)}`);
      // --- END OF NEW LOGIC (Part 1) ---


      // 5. "Align" the data: Combine trades with market details
      const alignedMarkets = trades.map((trade: any) => {
        const marketDetails = marketInfoCache.get(trade.ticker);
        return {
          ...trade, 
          ...marketDetails, 
          id: trade.trade_id || `${trade.ticker}-${trade.created_time}`
        };
      });

      // 6. Group trades into "Markets" for our dashboard
      const marketsMap = new Map<string, Market>();
      
      for (const alignedTrade of alignedMarkets) {
        
        if (!marketInfoCache.has(alignedTrade.ticker)) {
          continue;
        }

        // --- 4. NEW WHALE LOGIC (Part 2: Apply Threshold) ---
        
        // (a) Notional value of this single trade (in dollars)
        const tradeNotionalValue = (alignedTrade.count || 0) * (alignedTrade.price || 0);

        // (b) Apply the single "relative-to-leader" threshold
        const isWhaleTrade = tradeNotionalValue > whaleThreshold;
        
        // --- END OF NEW LOGIC (Part 2) ---

        if (!marketsMap.has(alignedTrade.ticker)) {
          // This is the first time we see this market, create its entry
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
            high_volume: isWhaleTrade, // Set flag based on our new logic
            trending: true, 
            high_liquidity: true, 
            recent: true,
            yes_bid_dollars: alignedTrade.yes_bid_dollars,
            no_bid_dollars: alignedTrade.no_bid_dollars,
            volume_24h: alignedTrade.volume_24h,
            previous_price: alignedTrade.previous_price,
            yes_ask: alignedTrade.yes_ask,
            yes_bid: alignedTrade.yes_bid
          });
        } else {
          // Market already exists
          const existingMarket = marketsMap.get(alignedTrade.ticker)!;
          
          existingMarket.volume = alignedTrade.volume; 
          
          if (isWhaleTrade) {
            existingMarket.high_volume = true;
          }
          
          existingMarket.last_price = alignedTrade.last_price;
          existingMarket.last_update = alignedTrade.created_time;
        }
      }

      const finalMarkets = Array.from(marketsMap.values());
      
      // 6. TITLE NULL FILTER
      const titledMarkets = finalMarkets.filter(market => 
        market.title && market.title.trim() !== "" && market.title !== "Unknown Title"
      );
      
      // 7. FINAL CRYPTO KEYWORD FILTER
      const filteredCryptoMarkets = titledMarkets.filter(market => {
        const ticker = market.ticker_symbol?.toLowerCase() || '';
        const title = market.title?.toLowerCase() || '';
        return cryptoKeywords.some(keyword => ticker.includes(keyword) || title.includes(keyword));
      });
      
      console.log(`Displaying ${filteredCryptoMarkets.length} clean crypto markets.`);

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
      description: `Whale activity detected on ${m.title}` // Changed copy
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