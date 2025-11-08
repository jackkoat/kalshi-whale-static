'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Market } from '../types'
import { formatCurrency, formatRelativeTime, formatProbability, getMarketCategoryColor } from '../lib/utils'
import { cn } from '../lib/utils'
import { 
  FireIcon, 
  ChartBarIcon,
  ClockIcon,
  ArrowTrendingUpIcon
} from '@heroicons/react/24/outline'

interface MarketCardProps {
  market: Market
  onOutcomeClick?: (outcome: 'YES' | 'NO', marketId: string) => void
  className?: string
  showDetails?: boolean
}

export function MarketCard({ 
  market, 
  onOutcomeClick, 
  className,
  showDetails = true 
}: MarketCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  
  const yesProbability = (market.last_price || 0) / 100;
  const noProbability = 1 - yesProbability;
  
  const displayTitle = market.title;
  const displayCategory = market.category || 'Crypto';
  
  const categoryColor = getMarketCategoryColor(displayCategory);
  const volumeFormatted = formatCurrency(market.volume);

  return (
    <motion.div
      className={cn(
        'market-card group',
        className
      )}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      whileHover={{ y: -2 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="market-card-header">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <span className={cn('px-2 py-1 rounded-full text-xs font-medium', categoryColor)}>
              {displayCategory}
            </span>
            {market.trending && (
              <span className="trending-badge">
                <FireIcon className="w-3 h-3 mr-1" />
                Trending
              </span>
            )}
          </div>
          
          <h3 className="market-card-title">
            {market.title}
          </h3>
        </div>
        
        <div className="flex flex-col items-end space-y-1">
          <span className={cn(
            'px-2 py-1 rounded-full text-xs font-medium',
            market.status === 'open' || market.status === 'active' ? 'status-positive' : 'status-neutral'
          )}>
            {market.status.toUpperCase()}
          </span>
          <div className="flex items-center text-sm text-neutral-500">
            <ChartBarIcon className="w-4 h-4 mr-1" />
            {volumeFormatted}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-neutral-700">YES</span>
              <span className="text-sm font-semibold text-green-600">
                {formatProbability(yesProbability)}
              </span>
            </div>
            
            <div className="relative">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <motion.div
                  className="bg-gradient-to-r from-green-500 to-emerald-600 h-2 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${yesProbability * 100}%` }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                />
              </div>
              <motion.div
                className="absolute -top-1 -right-1 w-3 h-3 bg-white border-2 border-green-500 rounded-full"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.3, delay: 0.5 }}
              />
            </div>
            
            <p className="text-xs text-neutral-600 line-clamp-2">
              {market.yes_bid_dollars || 'YES outcome'}
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-neutral-700">NO</span>
              <span className="text-sm font-semibold text-red-600">
                {formatProbability(noProbability)}
              </span>
            </div>
            
            <div className="relative">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <motion.div
                  className="bg-gradient-to-r from-red-500 to-red-600 h-2 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${noProbability * 100}%` }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                />
              </div>
              <motion.div
                className="absolute -top-1 -right-1 w-3 h-3 bg-white border-2 border-red-500 rounded-full"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.3, delay: 0.5 }}
              />
            </div>
            
            <p className="text-xs text-neutral-600 line-clamp-2">
              {market.no_bid_dollars || 'NO outcome'}
            </p>
          </div>
        </div>

        {/* <div className="flex space-x-2">
          <button
            onClick={() => onOutcomeClick?.('YES', market.id)}
            className="pill-button-yes flex-1"
          >
            Bet YES
          </button>
          <button
            onClick={() => onOutcomeClick?.('NO', market.id)}
            className="pill-button-no flex-1"
          >
            Bet NO
          </button>
        </div> */}
      </div>

      {showDetails && (
        <div className="market-card-meta pt-3 border-t border-gray-100">
          <div className="flex items-center justify-between w-full text-xs text-neutral-500">
            <div className="flex items-center space-x-3">

              
              {market.expiration_time && (
                <div className="flex items-center">
                  <span>Expires: {new Date(market.expiration_time).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                </div>
              )}
            </div>
            
            {market.high_liquidity && (
              <div className="flex items-center text-green-600">
                <ArrowTrendingUpIcon className="w-3 h-3 mr-1" />
                High Liquidity
              </div>
            )}
          </div>
        </div>
      )}

      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-brand-green-primary/5 to-brand-green-deep/5 rounded-xl opacity-0"
        animate={{ opacity: isHovered ? 1 : 0 }}
        transition={{ duration: 0.3 }}
      />
    </motion.div>
  )
}

export function MarketCardCompact({ 
  market, 
  onOutcomeClick, 
  className 
}: MarketCardProps) {
  const yesProbability = (market.last_price || 0) / 100;
  
  const displayTitle = market.title;
  const displayCategory = market.category || 'Crypto';

  return (
    <motion.div
      className={cn(
        'flex items-center justify-between p-4 glass-card',
        className
      )}
      whileHover={{ x: 4 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-medium text-neutral-900 truncate">
          {displayTitle}
        </h4>
        <div className="flex items-center space-x-2 mt-1">
          <span className="text-xs text-neutral-500">{displayCategory}</span>
          <span className="text-xs text-neutral-400">•</span>
          <span className="text-xs text-neutral-500">
            {formatCurrency(market.volume)}
          </span>
        </div>
      </div>
      
      <div className="flex items-center space-x-2 ml-4">
        {yesProbability !== null && (
          <div className="text-right">
            <div className="text-sm font-semibold text-green-600">
              {formatProbability(yesProbability)}
            </div>
            <div className="text-xs text-neutral-500">YES</div>
          </div>
        )}
        
        <button
          onClick={() => onOutcomeClick?.('YES', market.id)}
          className="pill-button-yes text-xs px-3 py-1"
        >
          Bet
        </button>
      </div>
    </motion.div>
  )
}