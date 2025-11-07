#!/bin/bash

# KalshiWhale Backend Startup Script
echo "🐋 Starting KalshiWhale Backend..."

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.8+ to continue."
    exit 1
fi

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install dependencies
echo "📚 Installing dependencies..."
pip install -r requirements.txt

# Set environment variables if .env exists
if [ -f ".env" ]; then
    echo "⚙️ Loading environment configuration..."
    export $(cat .env | grep -v '^#' | xargs)
fi

# Start the server
echo "🚀 Starting server..."
echo "🌍 API will be available at: http://localhost:${PORT:-8000}"
echo "📡 WebSocket endpoint: ws://localhost:${PORT:-8000}/ws"
echo "⚡ API endpoints: http://localhost:${PORT:-8000}/api"
echo ""
echo "Press Ctrl+C to stop the server"

python3 main.py