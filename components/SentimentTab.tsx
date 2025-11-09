'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useMarkets } from '../lib/react-query'
import { Market } from '@/types'
import { ChartBarIcon } from '@heroicons/react/24/outline' 

/**
 * A helper component to render the sentiment gauge
 */
const SentimentGauge = ({ score }: { score: number }) => {
  const getScoreColor = (s: number) => {
    if (s <= 24) return 'text-red-500' // Extreme Fear
    if (s <= 49) return 'text-amber-500' // Fear
    if (s <= 74) return 'text-lime-500' // Greed
    return 'text-green-500' // Extreme Greed
  }

  const color = getScoreColor(score)
  const circumference = 2 * Math.PI * 50 // 2 * pi * radius (radius is 50)
  const offset = circumference - (score / 100) * circumference

  return (
    <div className="relative w-64 h-64 flex items-center justify-center">
      <svg className="w-full h-full" viewBox="0 0 120 120">
        {/* Background Arc */}
        <circle
          className="text-gray-200"
          strokeWidth="10"
          stroke="currentColor"
          fill="transparent"
          r="50"
          cx="60"
          cy="60"
        />
        {/* Foreground Arc */}
        <motion.circle
          className={color}
          strokeWidth="10"
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r="50"
          cx="60"
          cy="60"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 60 60)"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: "circOut" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <motion.span
          className={`text-6xl font-bold ${color}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {score.toFixed(0)}
        </motion.span>
      </div>
    </div>
  )
}

/**
 * Main component for the Sentiment Tab
 */
export function SentimentTab() {
  const { data: marketsData, isLoading, isError } = useMarkets()

  // This is the core logic. It runs the calculation only when market data changes.
  const sentimentData = useMemo(() => {
    if (!marketsData?.markets || marketsData.markets.length === 0) {
      return {
        finalScore: 50,
        sentimentText: 'Neutral',
        momentumScore: 50,
        spreadScore: 50,
        volumeScore: 50,
      }
    }

    const markets = marketsData.markets

    let totalMomentumScore = 0
    let totalSpreadScore = 0
    let totalVolumeScore = 0
    let maxVolume24h = 0

    // Find max volume first
    markets.forEach(market => {
      if (market.volume_24h > maxVolume24h) {
        maxVolume24h = market.volume_24h
      }
    })

    markets.forEach(market => {
      // 1. Price Momentum (0-100)
      const priceDelta = market.last_price - market.previous_price
      // Clamp between -25 and +25, then scale 0-100
      const clampedDelta = Math.max(-25, Math.min(25, priceDelta))
      const momentumScore = (clampedDelta + 25) * 2 // Maps -25 to 0, 0 to 50, 25 to 100
      totalMomentumScore += momentumScore

      // 2. Market Spread (0-100)
      const spread = market.yes_ask - market.yes_bid
      // Clamp between 0 and 20. A spread of 1 is 95 (Greed), 20+ is 0 (Fear)
      const clampedSpread = Math.max(0, Math.min(20, spread))
      const spreadScore = 100 - (clampedSpread * 5)
      totalSpreadScore += spreadScore

      // 3. Volume Score (0-100)
      if (maxVolume24h > 0) {
        const volumeScore = (market.volume_24h / maxVolume24h) * 100
        totalVolumeScore += volumeScore
      }
    })

    const marketCount = markets.length
    const avgMomentum = totalMomentumScore / marketCount
    const avgSpread = totalSpreadScore / marketCount
    const avgVolume = maxVolume24h > 0 ? totalVolumeScore / marketCount : 50 // Default to 50 if no volume

    // Final Score: 40% Momentum, 40% Spread, 20% Volume
    const finalScore = (avgMomentum * 0.4) + (avgSpread * 0.4) + (avgVolume * 0.2)

    let sentimentText = 'Neutral'
    if (finalScore <= 24) sentimentText = 'Extreme Fear'
    else if (finalScore <= 49) sentimentText = 'Fear'
    else if (finalScore <= 74) sentimentText = 'Greed'
    else sentimentText = 'Extreme Greed'

    return {
      finalScore,
      sentimentText,
      momentumScore: avgMomentum,
      spreadScore: avgSpread,
      volumeScore: avgVolume,
    }
  }, [marketsData])

  // --- Render Logic ---
  if (isLoading) {
    return (
      <div className="text-center py-12 text-neutral-500">
        <ChartBarIcon className="w-12 h-12 mx-auto mb-4 animate-pulse" />
        <h3 className="text-lg font-medium text-neutral-900 mb-2">
          Calculating KalshiFlow Sentiment...
        </h3>
        <p>Analyzing all crypto markets...</p>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="text-center py-12 text-red-600">
        <h3 className="text-lg font-medium mb-2">Error Loading Sentiment Data</h3>
        <p>Could not fetch market data to calculate score.</p>
      </div>
    )
  }

  return (
    <motion.div
      key="sentiment"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div className="glass-card p-6 flex flex-col items-center">
        <h3 className="text-lg font-semibold mb-4">
          KalshiFlow Sentiment Index
        </h3>
        <SentimentGauge score={sentimentData.finalScore} />
        <motion.div
          className="text-4xl font-bold mt-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          {sentimentData.sentimentText}
        </motion.div>
        <p className="text-neutral-600 mt-2 text-center max-w-md">
          This is a custom index (0-100) that measures sentiment across all
          Kalshi crypto markets based on momentum, spreads, and volume.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="glass-card p-6 text-center">
          <h4 className="text-sm font-medium text-neutral-500 mb-2">
            Price Momentum
          </h4>
          <div className="text-4xl font-bold text-neutral-800">
            {sentimentData.momentumScore.toFixed(0)}
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            (last_price vs previous_price)
          </p>
        </div>
        <div className="glass-card p-6 text-center">
          <h4 className="text-sm font-medium text-neutral-500 mb-2">
            Market Spread
          </h4>
          <div className="text-4xl font-bold text-neutral-800">
            {sentimentData.spreadScore.toFixed(0)}
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            (yes_ask vs yes_bid)
          </p>
        </div>
        <div className="glass-card p-6 text-center">
          <h4 className="text-sm font-medium text-neutral-500 mb-2">
            Volume Activity
          </h4>
          <div className="text-4xl font-bold text-neutral-800">
            {sentimentData.volumeScore.toFixed(0)}
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            (volume_24h vs max_volume)
          </p>
        </div>
      </div>
    </motion.div>
  )
}