import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { 
  Market, 
  WhaleSignal, 
  MacroEvent, 
  MarketFilters, 
  SortOptions,
  UIState,
  Notification,
  AppConfig
} from '@/types'

interface MarketStore {
  // State
  markets: Market[]
  filteredMarkets: Market[]
  whaleSignals: WhaleSignal[]
  macroEvents: MacroEvent[]
  filters: MarketFilters
  sortOptions: SortOptions
  loading: boolean
  error: string | null
  lastUpdate: string | null
  
  // Actions
  setMarkets: (markets: Market[]) => void
  setFilteredMarkets: (markets: Market[]) => void
  updateMarket: (marketId: string, updates: Partial<Market>) => void
  setFilters: (filters: Partial<MarketFilters>) => void
  setSortOptions: (options: SortOptions) => void
  setWhaleSignals: (signals: WhaleSignal[]) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  applyFilters: () => void
  refreshData: () => Promise<void>
}

interface WhaleStore {
  // State
  activeSignals: WhaleSignal[]
  recentSignals: WhaleSignal[]
  signalTypes: Record<string, number>
  confidenceThreshold: number
  autoAlerts: boolean
  
  // Actions
  addSignal: (signal: WhaleSignal) => void
  setActiveSignals: (signals: WhaleSignal[]) => void
  setConfidenceThreshold: (threshold: number) => void
  toggleAutoAlerts: () => void
  markAsRead: (signalId: string) => void
  clearOldSignals: (hours: number) => void
}

interface UIStore extends UIState {
  // Additional UI state
  sidebarCollapsed: boolean
  theme: 'light' | 'dark' | 'system'
  notifications: Notification[]
  
  // Actions
  toggleSidebar: () => void
  setTheme: (theme: 'light' | 'dark' | 'system') => void
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void
  removeNotification: (id: string) => void
  markNotificationRead: (id: string) => void
  clearAllNotifications: () => void
  setFilters: (filters: UIState['filters']) => void
}

interface AppStore {
  // State
  config: AppConfig
  status: {
    connected: boolean
    lastHeartbeat: string | null
    activeConnections: number
    uptime: number
  }
  
  // Actions
  setConfig: (config: Partial<AppConfig>) => void
  updateStatus: (status: Partial<AppStore['status']>) => void
  reset: () => void
}

// Market Store
export const useMarketStore = create<MarketStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    markets: [],
    filteredMarkets: [],
    whaleSignals: [],
    macroEvents: [],
    filters: {},
    sortOptions: { field: 'volume', direction: 'desc' },
    loading: false,
    error: null,
    lastUpdate: null,

    // Actions
    setMarkets: (markets) => {
      set({ markets, lastUpdate: new Date().toISOString() })
      get().applyFilters()
    },

    setFilteredMarkets: (filteredMarkets) => {
      set({ filteredMarkets })
    },

    updateMarket: (marketId, updates) => {
      const { markets } = get()
      const updatedMarkets = markets.map(market =>
        market.id === marketId ? { ...market, ...updates } : market
      )
      set({ markets: updatedMarkets })
      get().applyFilters()
    },

    setFilters: (newFilters) => {
      const { filters } = get()
      set({ filters: { ...filters, ...newFilters } })
      get().applyFilters()
    },

    setSortOptions: (options) => {
      set({ sortOptions: options })
      get().applyFilters()
    },

    setWhaleSignals: (signals) => {
      set({ whaleSignals: signals })
    },

    setLoading: (loading) => set({ loading }),
    setError: (error) => set({ error }),

    applyFilters: () => {
      const { markets, filters, sortOptions } = get()
      
      let filtered = [...markets]

      // Apply filters
      if (filters.category) {
        filtered = filtered.filter(market => market.category === filters.category)
      }
      
      if (filters.status) {
        filtered = filtered.filter(market => market.status === filters.status)
      }
      
      if (filters.volume_min !== undefined) {
        filtered = filtered.filter(market => market.volume >= filters.volume_min!)
      }
      
      if (filters.volume_max !== undefined) {
        filtered = filtered.filter(market => market.volume <= filters.volume_max!)
      }
      
      if (filters.trending_only) {
        filtered = filtered.filter(market => market.trending)
      }
      
      if (filters.high_volume_only) {
        filtered = filtered.filter(market => market.high_volume)
      }

      // Apply sorting
      filtered.sort((a, b) => {
        const aValue = a[sortOptions.field] as number | string
        const bValue = b[sortOptions.field] as number | string
        
        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return sortOptions.direction === 'desc' ? bValue - aValue : aValue - bValue
        }
        
        const comparison = String(aValue).localeCompare(String(bValue))
        return sortOptions.direction === 'desc' ? -comparison : comparison
      })

      set({ filteredMarkets: filtered })
    },

    refreshData: async () => {
      set({ loading: true, error: null })
      
      try {
        // This would make API calls to refresh data
        // For now, just simulate
        await new Promise(resolve => setTimeout(resolve, 1000))
        set({ loading: false })
      } catch (error) {
        set({ 
          loading: false, 
          error: error instanceof Error ? error.message : 'Failed to refresh data' 
        })
      }
    },
  }))
)

// Whale Store
export const useWhaleStore = create<WhaleStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    activeSignals: [],
    recentSignals: [],
    signalTypes: {},
    confidenceThreshold: 70,
    autoAlerts: true,

    // Actions
    addSignal: (signal) => {
      const { activeSignals, recentSignals } = get()
      
      // Add to active signals
      set({ 
        activeSignals: [signal, ...activeSignals.slice(0, 49)] // Keep last 50
      })
      
      // Add to recent signals
      const updatedRecentSignals = [signal, ...recentSignals.slice(0, 99)] // Keep last 100
      set({ recentSignals: updatedRecentSignals })
      
      // Update signal types
      const { signalTypes } = get()
      const updatedTypes = {
        ...signalTypes,
        [signal.type]: (signalTypes[signal.type] || 0) + 1
      }
      set({ signalTypes: updatedTypes })
    },

    setActiveSignals: (signals) => set({ activeSignals: signals }),
    setConfidenceThreshold: (threshold) => set({ confidenceThreshold: threshold }),
    toggleAutoAlerts: () => set(state => ({ autoAlerts: !state.autoAlerts })),

    markAsRead: (signalId) => {
      const { activeSignals } = get()
      const updatedSignals = activeSignals.map(signal =>
        signal.id === signalId ? { ...signal, read: true } : signal
      )
      set({ activeSignals: updatedSignals })
    },

    clearOldSignals: (hours) => {
      const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()
      set(state => ({
        recentSignals: state.recentSignals.filter(
          signal => signal.timestamp > cutoff
        )
      }))
    },
  }))
)

// UI Store
export const useUIStore = create<UIStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    sidebar_open: true,
    sidebarCollapsed: false,
    filters: {
      category: '',
      time_range: '1d',
      signal_strength: 'all'
    },
    theme: 'light',
    notifications: [],

    // Actions
    toggleSidebar: () => set(state => ({ 
      sidebar_open: !state.sidebar_open,
      sidebarCollapsed: !state.sidebarCollapsed 
    })),
    
    setTheme: (theme) => set({ theme }),
    
    addNotification: (notification) => {
      const id = Date.now().toString()
      const timestamp = new Date().toISOString()
      
      set(state => ({
        notifications: [
          { ...notification, id, timestamp },
          ...state.notifications.slice(0, 99) // Keep last 100
        ]
      }))
      
      // Auto-remove if specified
      if (notification.auto_close) {
        setTimeout(() => {
          get().removeNotification(id)
        }, 5000)
      }
    },
    
    removeNotification: (id) => {
      set(state => ({
        notifications: state.notifications.filter(n => n.id !== id)
      }))
    },
    
    markNotificationRead: (id) => {
      set(state => ({
        notifications: state.notifications.map(n =>
          n.id === id ? { ...n, read: true } : n
        )
      }))
    },
    
    clearAllNotifications: () => set({ notifications: [] }),
    
    setFilters: (filters) => set(state => ({
      filters: { ...state.filters, ...filters }
    })),
  }))
)

// App Store
export const useAppStore = create<AppStore>()(
  subscribeWithSelector((set) => ({
    // Initial state
    config: {
      api: {
        base_url: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api',
        ws_url: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/ws',
        timeout: 10000,
        retry_attempts: 3
      },
      ui: {
        refresh_interval: 30000,
        auto_scroll: true,
        animations_enabled: true,
        theme: 'light'
      },
      alerts: {
        whale_threshold: 1000000,
        volume_spike_multiplier: 3.0,
        odds_change_threshold: 15,
        notifications_enabled: true
      }
    },
    status: {
      connected: false,
      lastHeartbeat: null,
      activeConnections: 0,
      uptime: 0
    },

    // Actions
    setConfig: (configUpdates) => set(state => ({
      config: { ...state.config, ...configUpdates }
    })),
    
    updateStatus: (statusUpdates) => set(state => ({
      status: { ...state.status, ...statusUpdates }
    })),
    
    reset: () => set({
      config: {
        api: {
          base_url: 'http://localhost:8000/api',
          ws_url: 'ws://localhost:8000/ws',
          timeout: 10000,
          retry_attempts: 3
        },
        ui: {
          refresh_interval: 30000,
          auto_scroll: true,
          animations_enabled: true,
          theme: 'light'
        },
        alerts: {
          whale_threshold: 1000000,
          volume_spike_multiplier: 3.0,
          odds_change_threshold: 15,
          notifications_enabled: true
        }
      },
      status: {
        connected: false,
        lastHeartbeat: null,
        activeConnections: 0,
        uptime: 0
      }
    })
  }))
)