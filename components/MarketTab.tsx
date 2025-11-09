'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useMarkets } from '../lib/react-query'
import { useMarketStore, useUIStore } from '../store'
import { MarketCard } from './MarketCard'
import { SkeletonGrid } from './MarketCardSkeleton' // Assuming this file exists
import { ChartBarIcon } from '@heroicons/react/24/outline'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/Pagination' // Assuming this file exists

export function MarketTab() {
  const [currentPage, setCurrentPage] = useState(1)
  const ITEMS_PER_PAGE = 8

  const { filteredMarkets, setMarkets } = useMarketStore()
  const { addNotification } = useUIStore()

  const {
    data: marketsData,
    isLoading: marketsLoading,
    isError: marketsIsError,
    error: marketsError,
  } = useMarkets()

  // Load markets into the store
  useEffect(() => {
    if (marketsData?.markets) {
      setMarkets(marketsData.markets)
    }
  }, [marketsData, setMarkets])

  // Memoize paginated markets
  const { paginatedMarkets, totalPages } = useMemo(() => {
    const total = filteredMarkets.length
    const totalPages = Math.ceil(total / ITEMS_PER_PAGE)
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
    const endIndex = startIndex + ITEMS_PER_PAGE
    const paginatedMarkets = filteredMarkets.slice(startIndex, endIndex)
    return { paginatedMarkets, totalPages }
  }, [filteredMarkets, currentPage])

  // Pagination handlers
  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages))
  }
  const handlePreviousPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1))
  }

  // Reset page on filter change
  useEffect(() => {
    setCurrentPage(1)
  }, [useMarketStore.getState().filters])

  // Render logic
  const renderMarketContent = () => {
    if (marketsLoading) {
      return <SkeletonGrid />
    }
    if (marketsIsError) {
      return (
        <div className="text-center py-12">
          <div className="text-red-600 mb-2">Error loading markets</div>
          <div className="text-sm text-neutral-600">
            {marketsError instanceof Error ? marketsError.message : String(marketsError)}
          </div>
        </div>
      )
    }
    if (filteredMarkets.length === 0) {
      return (
        <div className="text-center py-12">
          <ChartBarIcon className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-neutral-900 mb-2">
            No markets found
          </h3>
          <p className="text-neutral-600">
            Your API is working, but no crypto markets were found.
          </p>
        </div>
      )
    }
    return (
      <>
        <div className="data-grid">
          {paginatedMarkets.map((market) => (
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
        {totalPages > 1 && (
          <div className="mt-8">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={handlePreviousPage}
                    // @ts-ignore
                    disabled={currentPage === 1}
                  />
                </PaginationItem>
                <PaginationItem>
                  <span className="text-sm font-medium px-4">
                    Page {currentPage} of {totalPages}
                  </span>
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext
                    onClick={handleNextPage}
                    // @ts-ignore
                    disabled={currentPage === totalPages}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </>
    )
  }

  return (
    <motion.div
      key="markets"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
    >
      {renderMarketContent()}
    </motion.div>
  )
}