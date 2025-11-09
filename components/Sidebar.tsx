'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useMarketStore, useWhaleStore, useUIStore } from '../store'
import { WhaleSignalFeed } from './WhaleSignalCard'
import { cn, formatNumber } from '../lib/utils'
import {
  AdjustmentsHorizontalIcon,
  ChevronLeftIcon
} from '@heroicons/react/24/outline'

export function Sidebar() {
  const { 
    sidebar_open, 
    toggleSidebar 
  } = useUIStore()
  
  const { activeSignals, markAsRead } = useWhaleStore()
  const { filteredMarkets, filters, setFilters } = useMarketStore()
  const [showFilters, setShowFilters] = useState(false)

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