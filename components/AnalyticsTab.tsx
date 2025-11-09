'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useMarkets } from '../lib/react-query'
import { Market, AIAnalysis } from '@/types'
import { ArrowTrendingUpIcon } from '@heroicons/react/24/outline'
import { cn } from '@/lib/utils'

export function AnalyticsTab() {
  const { data: marketsData, isLoading: marketsLoading } = useMarkets()
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null)
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null)
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAnalyze = async (market: Market) => {
    setSelectedMarket(market)
    setIsLoadingAnalysis(true)
    setError(null)
    setAnalysis(null)
    
    try {
      // Call the AI engine API route
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(market),
      })
      
      if (!response.ok) {
        const errData = await response.json()
        throw new Error(errData.message || 'Failed to get analysis from AI')
      }
      
      const data: AIAnalysis = await response.json()
      setAnalysis(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoadingAnalysis(false)
    }
  }

  if (marketsLoading) {
    return (
      <div className="text-center py-12 text-neutral-500">
        <ArrowTrendingUpIcon className="w-12 h-12 mx-auto mb-4 animate-pulse" />
        <h3 className="text-lg font-medium text-neutral-900 mb-2">
          Loading Markets for Analysis...
        </h3>
      </div>
    )
  }

  return (
    <motion.div
      key="analytics"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="grid lg:grid-cols-2 gap-6"
    >
      {/* Column 1: Market List */}
      <div className="glass-card p-4 space-y-2 max-h-[600px] overflow-y-auto">
        <h3 className="text-lg font-semibold mb-2 px-2">Select a Market to Analyze</h3>
        {(marketsData?.markets || []).length === 0 && (
          <p className="px-2 text-sm text-neutral-500">
            No crypto markets found to analyze.
          </p>
        )}
        {(marketsData?.markets || []).map((market) => (
          <div
            key={market.id}
            onClick={() => handleAnalyze(market)}
            className={cn(
              'p-3 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors',
              selectedMarket?.id === market.id && 'bg-brand-green-light border border-brand-green-primary'
            )}
          >
            <h4 className="font-medium text-sm text-neutral-900">{market.title}</h4>
            <p className="text-xs text-neutral-600">
              Volume: {market.volume} | Last Price: {market.last_price}c
            </p>
          </div>
        ))}
      </div>

      {/* Column 2: Analysis Result */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold mb-4">AI Analysis (Channel 2)</h3>
        {!selectedMarket && !isLoadingAnalysis && (
          <div className="text-center py-12 text-neutral-500">
            <p>Select a market from the left to get an AI-powered 
               analysis from Mistral.
            </p>
          </div>
        )}
        
        {isLoadingAnalysis && (
          <div className="text-center py-12 text-neutral-500">
            <p className="animate-pulse font-medium">
              Asking Mistral for insights...
            </p>
            <p className="text-sm">This may take a moment.</p>
          </div>
        )}

        {error && (
          <div className="text-center py-12 text-red-600">
            <h4 className="font-semibold mb-2">Analysis Failed</h4>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {analysis && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            <div>
              <span className="text-sm font-semibold text-brand-green-deep">
                Summary:
              </span>
              <p className="text-neutral-700 font-semibold text-lg">"{analysis.summary}"</p>
            </div>
            <div>
              <span className="text-sm font-semibold text-brand-green-deep">
                Detailed Insight:
              </span>
              <p className="text-neutral-700">{analysis.insight}</p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm pt-4 border-t">
              <div className="bg-gray-100 p-3 rounded-lg">
                <span className="text-neutral-600 block text-xs">Confidence</span>
                <strong className="capitalize text-base">{analysis.confidence}</strong>
              </div>
              <div className="bg-gray-100 p-3 rounded-lg">
                <span className="text-neutral-600 block text-xs">Actionable</span>
                <strong className="capitalize text-base">{analysis.actionable ? 'Yes' : 'No'}</strong>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}