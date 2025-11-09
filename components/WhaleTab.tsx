'use client'

import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { useWhaleAlerts } from '../lib/react-query'
import { useWhaleStore } from '../store'
import { WhaleSignalFeed } from './WhaleSignalCard'
import { FireIcon } from '@heroicons/react/24/outline'

export function WhaleTab() {
  const { data: whaleData, isLoading, isError } = useWhaleAlerts()
  const { activeSignals, setActiveSignals, markAsRead } = useWhaleStore()

  // Load whale data into the store
  useEffect(() => {
    if (whaleData?.data) {
      setActiveSignals(whaleData.data.alerts || [])
    }
  }, [whaleData, setActiveSignals])

  const renderWhaleContent = () => {
    if (isLoading) {
      return (
        <div className="text-center py-12 text-neutral-500">
          <FireIcon className="w-12 h-12 mx-auto mb-4 animate-pulse" />
          <h3 className="text-lg font-medium text-neutral-900 mb-2">
            Scanning for Whale Activity...
          </h3>
          <p>Analyzing market data for large trades.</p>
        </div>
      )
    }
    if (isError) {
      return (
        <div className="text-center py-12 text-red-600">
          <h3 className="text-lg font-medium mb-2">Error Loading Whale Data</h3>
          <p>Could not fetch whale alert information.</p>
        </div>
      )
    }
    return (
      <>
        <div className="glass-card p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">
            Whale Detection Intelligence (Channel 1)
          </h3>
          <p className="text-neutral-600 mb-4">
            Displaying markets where a single trade was `&gt;` $500 AND `&gt;` 10% of 
            that market's 24-hour volume.
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <h4 className="font-medium text-amber-800 mb-2">
                Active Signals: {activeSignals.length}
              </h4>
              <p className="text-sm text-amber-700">
                Markets flagged for whale activity.
              </p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-medium text-green-800 mb-2">
                Detection Logic
              </h4>
              <p className="text-sm text-green-700">
                Using our relative "isWhaleTrade" flag.
              </p>
            </div>
          </div>
        </div>
        
        <WhaleSignalFeed
          signals={activeSignals}
          onMarkAsRead={markAsRead}
          maxHeight="600px"
        />
      </>
    )
  }

  return (
    <motion.div
      key="whale"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {renderWhaleContent()}
    </motion.div>
  )
}