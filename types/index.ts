export interface Market {
  id: string;
  question: string;
  category: string;
  last_update: string;
  volume: number;
  cadence: string;
  outcomes: Outcome[];
  high_volume: boolean;
  trending: boolean;
  high_liquidity: boolean;
  recent: boolean;
  status: 'open' | 'closed' | 'expired' | 'active';
  expiry_date?: string;
  liquidity?: number;
  volume_millions?: number;
  ticker_symbol?: string;
  title: string;
  event_ticker: string;
  last_price: number;
  yes_sub_title: string;
  no_sub_title: string;
  expiration_time: string;
  open_time: string;
  close_time: string;
  yes_bid_dollars: string;
  no_bid_dollars: string;
}

export interface Trade {
  count: number;
  created_time: string;
  no_price: number;
  price: number;
  taker_side: 'yes' | 'no';
  ticker: string;
  trade_id: string;
  yes_price: number;
}

export interface AlignedTrade extends Trade, Partial<Market> {
  // This combines a Trade with its (optional) Market details
}

export interface Outcome {
  title: 'YES' | 'NO';
  description: string;
  probability: number;
  odds?: number;
  volume?: number;
}

export interface WhaleSignal {
  id: string;
  type: 'volume_surge' | 'odds_flip' | 'order_book_shift' | 'liquidity_cluster' | 'large_trade';
  market_id: string;
  ticker: string;
  severity: 'high' | 'medium' | 'low';
  description: string;
  data: {
    current_value?: number;
    previous_value?: number;
    change_percent?: number;
    growth_multiple?: number;
    direction?: 'up' | 'down';
    trade_size?: number;
  };
  timestamp: string;
  confidence: number;
  market_impact?: 'high' | 'medium' | 'low';
}

export interface MarketMicrostructure {
  order_book_imbalance: number;
  notional_volume_spikes: boolean;
  rapid_odds_flips: boolean;
  large_directional_bets: boolean;
  liquidity_cluster_formation: boolean;
  spread_compression: boolean;
  volatility_bursts: boolean;
  volume_probability_divergence: boolean;
}

export interface MacroEvent {
  id: string;
  title: string;
  category: 'FOMC' | 'CPI' | 'NFP' | 'Fed Speech' | 'Earnings' | 'Economic Data';
  event_time: string;
  impact_level: 'High' | 'Medium' | 'Low';
  related_markets: string[];
  description?: string;
  status: 'upcoming' | 'live' | 'completed';
}

export interface WhaleActivity {
  market_id: string;
  ticker: string;
  activity_type: 'accumulation' | 'distribution' | 'hedge' | 'speculation';
  size: number;
  direction: 'long' | 'short' | 'neutral';
  confidence: number;
  timestamp: string;
  market_impact: 'high' | 'medium' | 'low';
}

export interface CryptoSignal {
  market_id: string;
  signal_type: 'regime_shift' | 'momentum' | 'reversion' | 'breakout';
  strength: number; // 0-100
  time_horizon: 'intraday' | 'daily' | 'weekly' | 'monthly';
  conviction_level: number; // 0-100
  metadata: {
    volume_profile?: number[];
    odds_movement?: number[];
    order_flow?: 'accumulating' | 'distributing' | 'neutral';
    sentiment?: 'bullish' | 'bearish' | 'neutral';
  };
  timestamp: string;
}

export interface InsightCard {
  id: string;
  type: 'macro_alert' | 'whale_detected' | 'signal_strong' | 'pattern_spotted';
  priority: 'urgent' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  market_id?: string;
  ticker?: string;
  impact_level: 'high' | 'medium' | 'low';
  action_required: boolean;
  timestamp: string;
  read: boolean;
}

export interface ApiResponse<T> {
  data: T;
  timestamp: string;
  status: 'success' | 'error';
  message?: string;
}

export interface TradesResponse {
  trades: Trade[];
  cursor: string;
}

export interface MarketsResponse {
  markets: Market[];
  count: number;
  filters_applied?: string[];
  timestamp: string;
  cursor?: string;
}

export interface MarketResponse {
  market: Market;
}

export interface EventResponse {
  event: Market; // We can reuse the Market type, as it has 'title'
}

export interface WhaleAlertsData {
  alerts: WhaleSignal[];
  count: number;
  whale_signals_count: number;
  high_volume_count: number;
  detection_types: {
    volume_surge: boolean;
    odds_flip: boolean;
    order_book_shift: boolean;
    high_volume: boolean;
  };
  thresholds: {
    volume_surge_multiplier: number;
    odds_change_percent: number;
    order_book_change_percent: number;
    minimum_volume: number;
  };
}

export interface WhaleAlertsResponse extends ApiResponse<WhaleAlertsData> {}

export interface StatusResponse {
  status: string;
  timestamp: string;
  last_update?: string;
  active_connections: number;
  total_markets: number;
  websocket_enabled: boolean;
  uptime: number;
  version: string;
}

export interface WebSocketMessage {
  type: 'initial_data' | 'market_update' | 'whale_alerts' | 'heartbeat' | 'insight';
  data: any;
  timestamp: string;
}

export interface MarketUpdate extends WebSocketMessage {
  type: 'market_update';
  data: {
    markets: Market[];
    timestamp: string;
    count: number;
  };
}

export interface WhaleAlert extends WebSocketMessage {
  type: 'whale_alerts';
  data: {
    alerts: WhaleSignal[];
    timestamp: string;
    count: number;
  };
}

export interface UIState {
  sidebar_open: boolean;
  filters: {
    category: string;
    time_range: string;
    signal_strength: string;
  };
  theme: 'light' | 'dark' | 'system';
  notifications: Notification[];
}

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: string;
  read?: boolean;
  auto_close?: boolean;
}

export interface MarketFilters {
  category?: string;
  status?: 'open' | 'closed' | 'expired';
  volume_min?: number;
  volume_max?: number;
  trending_only?: boolean;
  high_volume_only?: boolean;
  date_range?: {
    start: string;
    end: string;
  };
}

export interface SortOptions {
  field: 'volume' | 'last_update' | 'last_price' | 'ticker_symbol';
  direction: 'asc' | 'desc';
}

export interface ChartDataPoint {
  timestamp: string;
  value: number;
  volume?: number;
  metadata?: Record<string, any>;
}

export interface ProbabilityChart {
  market_id: string;
  data: ChartDataPoint[];
  timeframes: {
    '1h': ChartDataPoint[];
    '4h': ChartDataPoint[];
    '1d': ChartDataPoint[];
    '1w': ChartDataPoint[];
  };
}

export interface VolumeChart {
  market_id: string;
  bids: number[];
  asks: number[];
  timestamp: string;
}

export interface PerformanceMetrics {
  api_response_time: number;
  websocket_latency: number;
  cache_hit_rate: number;
  error_rate: number;
  uptime: number;
  active_users: number;
}

export interface AppConfig {
  api: {
    base_url: string;
    ws_url: string;
    timeout: number;
    retry_attempts: number;
  };
  ui: {
    refresh_interval: number;
    auto_scroll: boolean;
    animations_enabled: boolean;
    theme: 'light' | 'dark' | 'system';
  };
  alerts: {
    whale_threshold: number;
    volume_spike_multiplier: number;
    odds_change_threshold: number;
    notifications_enabled: boolean;
  };
}