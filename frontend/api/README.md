# KalshiWhale API Proxy
# This file provides CORS-safe API endpoints for the static version

# API endpoints available:
# 
# GET /api/markets
# Fetches crypto markets from Kalshi API
# Returns: JSON with Bitcoin and Ethereum markets
#
# GET /api/status
# Returns API status and health check
# Returns: JSON with connection status

# Note: This file is optional and serves as documentation
# The static version works without a backend by using direct Kalshi API calls
# Use this if you encounter CORS issues in your deployment

# For Vercel deployment, you can create api/markets.js to handle CORS: