/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['api.elections.kalshi.com'],
  },
  // Removed rewrites since backend is not used
  env: {
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/ws',
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api',
  },
}

module.exports = nextConfig