'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useMarkets, useWhaleAlerts, useWebSocket } from '../lib/react-query'
import { useMarketStore, useWhaleStore, useUIStore, useAppStore } from '../store'
import { MarketCard } from './MarketCard'
import { WhaleSignalFeed, LiveSignalIndicator } from './WhaleSignalCard'
import { cn, formatNumber } from '../lib/utils'
import {
  Bars3Icon,
  XMarkIcon,
  ChartBarIcon,
  FireIcon,
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  BellIcon,
  CogIcon,
  AdjustmentsHorizontalIcon,
  ChevronLeftIcon
} from '@heroicons/react/24/outline'
import Link from 'next/link'

function Sidebar() {
  const { 
    sidebar_open, 
    toggleSidebar 
  } = useUIStore()
  
  const { activeSignals, markAsRead } = useWhaleStore()
  const { filteredMarkets } = useMarketStore()
  const [showFilters, setShowFilters] = useState(false)
  const { filters, setFilters } = useMarketStore()

  const metrics = {
    totalMarkets: filteredMarkets.length,
    activeWhales: activeSignals.length,
    totalVolume: filteredMarkets.reduce((sum, m) => sum + m.volume, 0),
    avgLiquidity: filteredMarkets.reduce((sum, m) => sum + (m.volume || 0), 0) / Math.max(filteredMarkets.length, 1)
  }
  
  const sidebarVariants = {
    open: { width: 320, x: 0 },
    closed: { width: 0, x: -320 }
  }

  return (
    <motion.aside
      className="fixed inset-y-0 left-0 z-30 bg-white border-r border-gray-200 overflow-y-auto"
      initial="closed"
      animate={sidebar_open ? "open" : "closed"}
      variants={sidebarVariants}
      transition={{ duration: 0.3, ease: "easeInOut" }}
    >
      <div className="p-6" style={{width: 320}}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-neutral-900">
            Intelligence Panel
          </h2>
          <button
            onClick={toggleSidebar}
            className="p-1 rounded-md text-neutral-400 hover:text-neutral-600"
          >
            <ChevronLeftIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="glass-card p-4 text-center">
            <div className="text-2xl font-bold text-brand-green-primary">
              {formatNumber(metrics.totalMarkets)}
            </div>
            <div className="text-sm text-neutral-600">Markets</div>
          </div>
          
          <div className="glass-card p-4 text-center">
            <div className="text-2xl font-bold text-signal-whale">
              {metrics.activeWhales}
            </div>
            <div className="text-sm text-neutral-600">Whales</div>
          </div>
          
          <div className="glass-card p-4 text-center">
            <div className="text-lg font-bold text-signal-liquidity">
              ${formatNumber(metrics.totalVolume / 1000000)}M
            </div>
            <div className="text-sm text-neutral-600">Volume</div>
          </div>
          
          <div className="glass-card p-4 text-center">
            <div className="text-lg font-bold text-signal-volume">
              ${formatNumber(metrics.avgLiquidity / 1000000)}M
            </div>
            <div className="text-sm text-neutral-600">Avg Liq.</div>
          </div>
        </div>

        <div className="mb-6">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <span className="font-medium text-neutral-700">Filters</span>
            <AdjustmentsHorizontalIcon className="w-5 h-5 text-neutral-500" />
          </button>
          
          <AnimatePresence>
            {showFilters && (
              <motion.div
                className="mt-3 space-y-3"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <select
                  value={filters.category || ''}
                  onChange={(e) => setFilters({ category: e.target.value })}
                  className="w-full p-2 border border-gray-200 rounded-md text-sm focus:ring-brand-green-primary focus:border-brand-green-primary"
                >
                  <option value="">All Categories</option>
                  <option value="Crypto">Crypto</option>
                  <option value="Politics">Politics</option>
                  <option value="Economics">Economics</option>
                </select>
                
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={filters.trending_only || false}
                    onChange={(e) => setFilters({ trending_only: e.target.checked })}
                    className="rounded text-brand-green-primary focus:ring-brand-green-primary/50"
                  />
                  <span className="text-sm text-neutral-700">Trending only</span>
                </label>
                
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={filters.high_volume_only || false}
                    onChange={(e) => setFilters({ high_volume_only: e.target.checked })}
                    className="rounded text-brand-green-primary focus:ring-brand-green-primary/50"
                  />
                  <span className="text-sm text-neutral-700">High volume only</span>
                </label>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <WhaleSignalFeed
          signals={activeSignals.slice(0, 10)}
          onMarkAsRead={markAsRead}
          maxHeight="300px"
        />
      </div>
    </motion.aside>
  )
}

export function Dashboard() {
  const [activeTab, setActiveTab] = useState<'markets' | 'whale' | 'analytics'>('markets')
  
  const { 
    filteredMarkets, 
    loading: marketsLoading,
    error: marketsError 
  } = useMarketStore()
  
  const { activeSignals, addSignal, markAsRead } = useWhaleStore()
  
  const { 
    sidebar_open, 
    toggleSidebar,
    notifications,
    addNotification 
  } = useUIStore()
  
  const { updateStatus } = useAppStore()

  const { data: marketsData } = useMarkets()
  const { data: whaleData } = useWhaleAlerts()

  const { connect, disconnect, isConnected, lastMessage } = useWebSocket()

  useEffect(() => {
    const ws = connect(process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/ws')
    return () => { disconnect() }
  }, [connect, disconnect])

  useEffect(() => {
    if (lastMessage) {
      handleWebSocketMessage(lastMessage)
    }
  }, [lastMessage, addSignal, addNotification, updateStatus])

  const handleWebSocketMessage = (message: any) => {
    switch (message.type) {
      case 'market_update':
        useMarketStore.getState().setMarkets(message.data.markets || [])
        break
      case 'whale_alerts':
        if (message.data.alerts) {
          message.data.alerts.forEach((signal: any) => {
            addSignal(signal)
            addNotification({
              type: 'info',
              title: `Whale Alert: ${signal.ticker}`,
              message: signal.description,
              auto_close: true
            })
          })
        }
        break
      case 'heartbeat':
        updateStatus({ connected: true, lastHeartbeat: new Date().toISOString() })
        break
    }
  }

  useEffect(() => {
    if (marketsData?.data) {
      useMarketStore.getState().setMarkets(marketsData.data)
    }
  }, [marketsData])

  useEffect(() => {
    if (whaleData?.data) {
      useWhaleStore.getState().setActiveSignals(whaleData.data.alerts || [])
    }
  }, [whaleData])
  
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-gray-50">
    
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            className="fixed inset-0 z-40 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div 
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setMobileMenuOpen(false)}
            />
            
            <motion.div
              className="relative z-50 w-80 h-full bg-white"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              <Sidebar />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="hidden lg:block">
        <Sidebar />
      </div>

      <header className={cn(
        "bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-20",
        "transition-all duration-300",
        sidebar_open ? "lg:ml-80" : "lg:ml-0"
      )}>
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="p-2 rounded-md text-neutral-600 hover:text-neutral-900 hover:bg-gray-100 lg:hidden"
              >
                <Bars3Icon className="w-6 h-6" />
              </button>
              
              <button
                onClick={toggleSidebar}
                className="hidden lg:block p-2 rounded-md text-neutral-600 hover:text-neutral-900 hover:bg-gray-100"
              >
                <Bars3Icon className="w-6 h-6" />
              </button>
              
              <div className="flex items-center space-x-2">
                <Link href="/" className="flex items-center gap-3 text-2xl font-extrabold text-brand-green-deep">
                  <img src="/logo.png" alt="KalshiWhale Logo" className="w-32 h-32" />
                </Link>
              </div>
            </div>

            <div className="hidden md:flex items-center space-x-4">
              <LiveSignalIndicator 
                isActive={isConnected} 
                count={activeSignals.length} 
              />
              <div className="text-sm text-neutral-500">
                Last update: {marketsData?.timestamp ? new Date(marketsData.timestamp).toLocaleTimeString() : '...'}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button className="relative p-2 rounded-md text-neutral-600 hover:text-neutral-900 hover:bg-gray-100">
                <BellIcon className="w-6 h-6" />
                {notifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center">
                    {notifications.length}
                  </span>
                )}
              </button>
              <button className="p-2 rounded-md text-neutral-600 hover:text-neutral-900 hover:bg-gray-100">
                <CogIcon className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className={cn(
        'flex-1 transition-all duration-300',
        sidebar_open ? 'lg:ml-80' : 'lg:ml-0'
      )}>
        <div className="p-6">
          <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
            <button
              onClick={() => setActiveTab('markets')}
              className={cn(
                'px-4 py-2 rounded-md text-sm font-medium transition-colors',
                activeTab === 'markets'
                  ? 'bg-white text-brand-green-primary shadow-sm'
                  : 'text-neutral-600 hover:text-neutral-900'
              )}
            >
              Markets
            </button>
            <button
              onClick={() => setActiveTab('whale')}
              className={cn(
                'px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center space-x-1',
                activeTab === 'whale'
                  ? 'bg-white text-brand-green-primary shadow-sm'
                  : 'text-neutral-600 hover:text-neutral-900'
              )}
            >
              <FireIcon className="w-4 h-4" />
              <span>Whale Detection</span>
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={cn(
                'px-4 py-2 rounded-md text-sm font-medium transition-colors',
                activeTab === 'analytics'
                  ? 'bg-white text-brand-green-primary shadow-sm'
                  : 'text-neutral-600 hover:text-neutral-900'
              )}
            >
              Analytics
            </button>
          </div>

          <AnimatePresence mode="wait">
            {activeTab === 'markets' && (
              <motion.div
                key="markets"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                {marketsLoading ? (
                  <div className="grid data-grid gap-6">
                    {[...Array(8)].map((_, i) => (
                      <div key={i} className="glass-card p-6 animate-pulse">
                        <div className="space-y-4">
                          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                          <div className="h-8 bg-gray-200 rounded w-full"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : marketsError ? (
                  <div className="text-center py-12">
                    <div className="text-red-600 mb-2">Error loading markets</div>
                    <div className="text-sm text-neutral-600">{marketsError.toString()}</div>
                  </div>
                ) : (
                  <div className="data-grid">
                    {filteredMarkets.map((market) => (
                      <MarketCard
                        key={market.id}
                        market={market}
                        onOutcomeClick={(outcome, marketId) => {
                          addNotification({
                            type: 'info',
                            title: 'Bet Placed (Demo)',
                            message: `Bet ${outcome} on market ${marketId}`,
                            auto_close: true
                          })
                        }}
                      />
                    ))}
                  </div>
                )}
                
                {filteredMarkets.length === 0 && !marketsLoading && (
                  <div className="text-center py-12">
                    <ChartBarIcon className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-neutral-900 mb-2">
                      No markets found
                    </h3>
                    <p className="text-neutral-600">
                      Try adjusting your filters to see more markets.
                    </p>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'whale' && (
              <motion.div
                key="whale"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <div className="glass-card p-6">
                  <h3 className="text-lg font-semibold mb-4">
                    Whale Detection Intelligence
                  </h3>
                  <p className="text-neutral-600 mb-4">
                    Advanced algorithms detect institutional flow patterns across Kalshi markets.
                  </p>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <h4 className="font-medium text-amber-800 mb-2">
                        Active Signals: {activeSignals.length}
                      </h4>
                      <p className="text-sm text-amber-700">
                        Real-time whale activity monitoring
                      </p>
                    </div>
                    
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <h4 className="font-medium text-green-800 mb-2">
                        Detection Confidence
                      </h4>
                      <p className="text-sm text-green-700">
                        Advanced microstructure analysis
                      </p>
                    </div>
                  </div>
                </div>
                
                <WhaleSignalFeed
                  signals={activeSignals}
                  onMarkAsRead={markAsRead}
                  maxHeight="600px"
                />
              </motion.div>
            )}

            {activeTab === 'analytics' && (
              <motion.div
                key="analytics"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <div className="text-center py-12">
                  <ArrowTrendingUpIcon className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-neutral-900 mb-2">
                    Advanced Analytics
                  </h3>
                  <p className="text-neutral-600">
                    Detailed market microstructure analysis and pattern recognition coming soon.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  )
}