import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { QueryProvider } from '@/lib/react-query'
import '@/globals.css'

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap'
})

export const metadata: Metadata = {
  metadataBase: new URL('https://kalshiwhale.com'), // Add this to resolve OG/Twitter images
  title: 'KalshiWhale - Crypto Whale Intelligence Platform',
  description: 'Institutional-grade crypto intelligence platform for Kalshi Prediction Markets. Real-time whale detection, market microstructure analysis, and intelligent insights.',
  keywords: [
    'crypto',
    'prediction markets',
    'whale tracking',
    'kalshi',
    'real-time',
    'intelligence',
    'institutional',
    'trading'
  ],
  authors: [{ name: 'MiniMax Agent' }],
  creator: 'MiniMax Agent',
  publisher: 'KalshiWhale',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://kalshiwhale.com',
    title: 'KalshiWhale - Crypto Whale Intelligence Platform',
    description: 'Real-time whale detection and market intelligence for Kalshi Prediction Markets',
    siteName: 'KalshiWhale',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'KalshiWhale - Crypto Whale Intelligence Platform',
    description: 'Real-time whale detection and market intelligence for Kalshi Prediction Markets',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#1AAE6F" />
      </head>
      <body className={`${inter.className} antialiased`}>
        <QueryProvider>
          <div className="min-h-screen bg-gray-50">
            {children}
          </div>
        </QueryProvider>
      </body>
    </html>
  )
}