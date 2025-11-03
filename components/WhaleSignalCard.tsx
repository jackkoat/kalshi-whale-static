'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { WhaleSignal } from '@/types'
import { formatRelativeTime, getSeverityColor, formatPercentage, formatLargeNumber } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { 
  ExclamationTriangleIcon,
  FireIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ChartBarIcon,
  ClockIcon
} from '@heroicons/react/24/outline'

interface WhaleSignalCardProps {
  signal: WhaleSignal
  onMarkAsRead?: (id: string) => void
  className?: string
  compact?: boolean
}

export function WhaleSignalCard({ 
  signal, 
  onMarkAsRead, 
  className,
  compact = false 
}: WhaleSignalCardProps) {
  const severityColors = getSeverityColor(signal.severity)
  
  const getSignalIcon = () => {
    switch (signal.type) {
      case 'volume_surge':
        return <ChartBarIcon className="w-5 h-5" />
      case 'odds_flip':
        return <ArrowTrendingUpIcon className="w-5 h-5" />
      case 'order_book_shift':
        return <ArrowTrendingDownIcon className="w-5 h-5" />
      case 'liquidity_cluster':
        return <FireIcon className="w-5 h-5" />
      default:
        return <ExclamationTriangleIcon className="w-5 h-5" />
    }
  }

  const getSignalDescription = () => {
    const { data } = signal
    
    switch (signal.type) {
      case 'volume_surge':
        return `${formatLargeNumber(data.current_value || 0)} volume detected (${data.growth_multiple?.toFixed(1)}x normal)`
      
      case 'odds_flip':
        return `${formatPercentage((data.change_percent || 0) / 100)} probability ${data.direction} movement`
      
      case 'order_book_shift':
        return `${formatPercentage((data.change_percent || 0) / 100)} order book depth change`
      
      case 'liquidity_cluster':
        return `Large liquidity cluster formation detected`
      
      default:
        return signal.description
    }
  }

  if (compact) {
    return (
      <motion.div
        className={cn(
          'flex items-center space-x-3 p-3 glass-card',
          severityColors,
          className
        )}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        whileHover={{ scale: 1.02 }}
        transition={{ duration: 0.2 }}
      >
        <div className={cn(
          'p-2 rounded-full',
          signal.severity === 'high' ? 'bg-red-100 text-red-600' :
          signal.severity === 'medium' ? 'bg-yellow-100 text-yellow-600' :
          'bg-green-100 text-green-600'
        )}>
          {getSignalIcon()}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium truncate">
              {signal.ticker}
            </h4>
            <span className="text-xs text-neutral-500">
              {formatRelativeTime(signal.timestamp)}
            </span>
          </div>
          <p className="text-xs text-neutral-600 truncate">
            {getSignalDescription()}
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <span className={cn(
            'px-2 py-1 rounded-full text-xs font-medium',
            signal.severity === 'high' ? 'bg-red-100 text-red-800' :
            signal.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
            'bg-green-100 text-green-800'
          )}>
            {signal.confidence}%
          </span>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      className={cn(
        'whale-signal-card p-4 space-y-4',
        signal.severity === 'high' ? 'whale-signal-high' :
        signal.severity === 'medium' ? 'whale-signal-medium' :
        'whale-signal-low',
        className
      )}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3 }}
      layout
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3">
          <div className={cn(
            'p-2 rounded-full',
            signal.severity === 'high' ? 'bg-red-100 text-red-600' :
            signal.severity === 'medium' ? 'bg-yellow-100 text-yellow-600' :
            'bg-green-100 text-green-600'
          )}>
            {getSignalIcon()}
          </div>
          
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-semibold text-neutral-900">
                {signal.ticker}
              </h3>
              <span className={cn(
                'px-2 py-1 rounded-full text-xs font-medium',
                signal.severity === 'high' ? 'bg-red-100 text-red-800' :
                signal.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                'bg-green-100 text-green-800'
              )}>
                {signal.type.replace('_', ' ').toUpperCase()}
              </span>
            </div>
            
            <p className="text-sm text-neutral-600 mt-1">
              {signal.description}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <span className="text-xs text-neutral-500">
            {formatRelativeTime(signal.timestamp)}
          </span>
          <button
            onClick={() => onMarkAsRead?.(signal.id)}
            className="text-xs text-neutral-400 hover:text-neutral-600 transition-colors"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Signal Details */}
      <div className="bg-white/50 rounded-lg p-3 space-y-2">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-neutral-500">Type:</span>
            <span className="ml-2 font-medium capitalize">
              {signal.type.replace('_', ' ')}
            </span>
          </div>
          
          <div>
            <span className="text-neutral-500">Confidence:</span>
            <span className="ml-2 font-medium text-brand-green-primary">
              {signal.confidence}%
            </span>
          </div>
          
          {signal.data.change_percent !== undefined && (
            <div>
              <span className="text-neutral-500">Change:</span>
              <span className={cn(
                'ml-2 font-medium',
                (signal.data.change_percent || 0) > 0 ? 'text-green-600' : 'text-red-600'
              )}>
                {formatPercentage((signal.data.change_percent || 0) / 100)}
              </span>
            </div>
          )}
          
          {signal.data.growth_multiple !== undefined && (
            <div>
              <span className="text-neutral-500">Growth:</span>
              <span className="ml-2 font-medium text-green-600">
                {signal.data.growth_multiple.toFixed(1)}x
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Market Impact */}
      <div className="flex items-center justify-between pt-2 border-t border-white/30">
        <div className="flex items-center space-x-2 text-sm text-neutral-600">
          <ClockIcon className="w-4 h-4" />
          <span>Market Impact: {signal.market_impact}</span>
        </div>
        
        <div className="flex items-center space-x-1">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className={cn(
                'w-2 h-2 rounded-full',
                i < Math.ceil(signal.confidence / 20) 
                  ? 'bg-brand-green-primary' 
                  : 'bg-gray-200'
              )}
            />
          ))}
        </div>
      </div>
    </motion.div>
  )
}

// Signal feed component for real-time updates
interface WhaleSignalFeedProps {
  signals: WhaleSignal[]
  onMarkAsRead?: (id: string) => void
  maxHeight?: string
  className?: string
}

export function WhaleSignalFeed({ 
  signals, 
  onMarkAsRead, 
  maxHeight = '400px',
  className 
}: WhaleSignalFeedProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-neutral-900">
          Whale Signals
        </h3>
        <span className="text-sm text-neutral-500">
          {signals.length} active
        </span>
      </div>
      
      <div 
        className="space-y-2 overflow-y-auto pr-2"
        style={{ maxHeight }}
      >
        <AnimatePresence>
          {signals.map((signal) => (
            <WhaleSignalCard
              key={signal.id}
              signal={signal}
              onMarkAsRead={onMarkAsRead}
              compact
            />
          ))}
        </AnimatePresence>
        
        {signals.length === 0 && (
          <div className="text-center py-8 text-neutral-500">
            <FireIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No whale signals detected</p>
            <p className="text-sm">Market activity appears normal</p>
          </div>
        )}
      </div>
    </div>
  )
}

// Live indicator for new signals
interface LiveSignalIndicatorProps {
  isActive: boolean
  count: number
}

export function LiveSignalIndicator({ isActive, count }: LiveSignalIndicatorProps) {
  return (
    <div className={cn(
      'inline-flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium',
      isActive 
        ? 'bg-red-50 text-red-700 border border-red-200' 
        : 'bg-gray-50 text-gray-700 border border-gray-200'
    )}>
      <div className={cn(
        'w-2 h-2 rounded-full',
        isActive ? 'bg-red-500 animate-pulse' : 'bg-gray-400'
      )} />
      <span>
        {isActive ? 'LIVE' : 'STANDBY'}
      </span>
      {count > 0 && (
        <span className="bg-brand-green-primary text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
          {count}
        </span>
      )}
    </div>
  )
}