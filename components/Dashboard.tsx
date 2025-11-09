'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useWebSocket } from '../lib/react-query'
import { useMarketStore, useWhaleStore, useUIStore, useAppStore } from '../store'
import { LiveSignalIndicator } from './WhaleSignalCard'
import { cn } from '../lib/utils'
import {
  Bars3Icon,
  XMarkIcon,
  FireIcon,
  BellIcon,
  CogIcon,
} from '@heroicons/react/24/outline'
import { Sidebar } from './Sidebar' 
import { MarketTab } from './MarketTab'
import { WhaleTab } from './WhaleTab'
import { AnalyticsTab } from './AnalyticsTab'
import Link from 'next/link'


export function Dashboard() {
  const [activeTab, setActiveTab] = useState<'markets' | 'whale' | 'analytics'>('markets')
  
  const { activeSignals, addSignal } = useWhaleStore()
  const { sidebar_open, toggleSidebar, notifications, addNotification } = useUIStore()
  const { updateStatus } = useAppStore()
  const { lastUpdate } = useMarketStore() 

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
                Last update: {lastUpdate ? new Date(lastUpdate).toLocaleTimeString() : '...'}
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
              <MarketTab />
            )}

            {activeTab === 'whale' && (
              <WhaleTab />
            )}

            {activeTab === 'analytics' && (
              <AnalyticsTab />
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  )
}