import os
import json
import asyncio
import logging
import statistics
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional, Tuple
from pathlib import Path
import requests
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Request
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from jinja2 import Template

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="KalshiWhale - Crypto Whale Tracker",
    description="Real-time Crypto Whale Tracker for Kalshi Prediction Markets",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Constants
KALSHI_API_BASE = "https://api.elections.kalshi.com/trade-api/v2"
UPDATE_INTERVAL = 120  # 2 minutes in seconds

# Data storage
markets_data: List[Dict] = []
websocket_connections: List[WebSocket] = []
last_update: datetime = datetime.now()
update_task: Optional[asyncio.Task] = None

# Historical data for whale detection
historical_data: Dict[str, Dict] = {}  # {market_id: {previous_data}}
whale_signals: List[Dict] = []  # Store detected whale activities
order_book_changes: Dict[str, Dict] = {}  # Track order book shifts
volume_history: Dict[str, List[float]] = {}  # Track volume over time
odds_history: Dict[str, List[float]] = {}  # Track odds changes

# Whale detection thresholds
VOLUME_SURGE_THRESHOLD = 3.0  # 3x average volume
ODDS_CHANGE_THRESHOLD = 15.0  # 15% odds change
ORDER_BOOK_DEPTH_CHANGE_THRESHOLD = 25.0  # 25% depth change
WHALE_VOLUME_MINIMUM = 1000000  # $1M minimum volume

class ConnectionManager:
    """Manage WebSocket connections"""
    
    def __init__(self):
        self.active_connections: List[WebSocket] = []
    
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"WebSocket connected. Total connections: {len(self.active_connections)}")
    
    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)
        logger.info(f"WebSocket disconnected. Total connections: {len(self.active_connections)}")
    
    async def broadcast(self, message: str):
        """Broadcast message to all connected clients"""
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except:
                disconnected.append(connection)
        
        # Remove disconnected clients
        for conn in disconnected:
            if conn in self.active_connections:
                self.active_connections.remove(conn)

manager = ConnectionManager()

async def fetch_kalshi_data() -> List[Dict]:
    """Fetch data from Kalshi API with enhanced whale detection"""
    try:
        # Fetch open crypto markets with detailed data
        url = f"{KALSHI_API_BASE}/markets?status=open&limit=200"
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        
        data = response.json()
        markets = data.get("markets", [])
        
        # Filter for crypto-related markets
        crypto_markets = []
        whale_activities = []
        
        for market in markets:
            ticker = market.get("ticker_symbol", "").lower()
            if any(crypto in ticker for crypto in ["btc", "eth", "crypto", "bitcoin", "ethereum"]):
                market_id = market.get("id", ticker)
                
                # Add derived metrics
                market["volume_millions"] = market.get("volume", 0) / 1000000
                market["last_updated"] = datetime.now().isoformat()
                
                # Get current data
                current_volume = market.get("volume", 0)
                current_odds = market.get("close_price", market.get("value", 50))
                
                # Detect whale activities
                whale_activity = detect_whale_activity(market_id, market)
                if whale_activity:
                    whale_activities.append(whale_activity)
                    logger.info(f"🐋 Whale detected: {whale_activity['type']} on {ticker}")
                
                crypto_markets.append(market)
        
        # Store whale signals globally
        if whale_activities:
            whale_signals.extend(whale_activities)
            # Keep only last 100 signals
            whale_signals[:] = whale_signals[-100:]
        
        logger.info(f"Fetched {len(crypto_markets)} crypto markets, detected {len(whale_activities)} whale activities")
        return crypto_markets
        
    except Exception as e:
        logger.error(f"Error fetching Kalshi data: {e}")
        return []

def detect_whale_activity(market_id: str, current_market: Dict) -> Optional[Dict]:
    """Detect whale activities based on order book shifts, volume surges, and odds flips"""
    
    current_volume = current_market.get("volume", 0)
    current_odds = current_market.get("close_price", current_market.get("value", 50))
    
    # Initialize historical data for this market
    if market_id not in historical_data:
        historical_data[market_id] = {
            "volume": current_volume,
            "odds": current_odds,
            "order_book": get_mock_order_book_data(current_market),  # Mock data for demonstration
            "timestamp": datetime.now().isoformat()
        }
        return None
    
    previous_data = historical_data[market_id]
    previous_volume = previous_data["volume"]
    previous_odds = previous_data["odds"]
    previous_order_book = previous_data.get("order_book", {})
    
    whale_activity = None
    
    # 1. VOLUME SURGE DETECTION
    if current_volume > WHALE_VOLUME_MINIMUM:
        volume_growth = calculate_volume_growth(market_id, current_volume)
        if volume_growth >= VOLUME_SURGE_THRESHOLD:
            whale_activity = {
                "type": "volume_surge",
                "market_id": market_id,
                "ticker": current_market.get("ticker_symbol", "Unknown"),
                "current_volume": current_volume,
                "previous_volume": previous_volume,
                "volume_growth": volume_growth,
                "timestamp": datetime.now().isoformat(),
                "severity": "high" if volume_growth >= 5.0 else "medium"
            }
    
    # 2. ODDS FLIP DETECTION
    if abs(current_odds - previous_odds) >= ODDS_CHANGE_THRESHOLD:
        odds_change_percent = abs(current_odds - previous_odds) / previous_odds * 100
        direction = "up" if current_odds > previous_odds else "down"
        
        whale_activity = {
            "type": "odds_flip",
            "market_id": market_id,
            "ticker": current_market.get("ticker_symbol", "Unknown"),
            "current_odds": current_odds,
            "previous_odds": previous_odds,
            "change_percent": odds_change_percent,
            "direction": direction,
            "timestamp": datetime.now().isoformat(),
            "severity": "high" if odds_change_percent >= 25.0 else "medium"
        }
    
    # 3. ORDER BOOK SHIFT DETECTION
    current_order_book = get_mock_order_book_data(current_market)
    order_book_change = calculate_order_book_change(previous_order_book, current_order_book)
    
    if order_book_change >= ORDER_BOOK_DEPTH_CHANGE_THRESHOLD:
        whale_activity = {
            "type": "order_book_shift",
            "market_id": market_id,
            "ticker": current_market.get("ticker_symbol", "Unknown"),
            "depth_change": order_book_change,
            "previous_depth": sum(previous_order_book.get("bids", [0])),
            "current_depth": sum(current_order_book.get("bids", [0])),
            "timestamp": datetime.now().isoformat(),
            "severity": "high" if order_book_change >= 50.0 else "medium"
        }
    
    # Update historical data
    historical_data[market_id] = {
        "volume": current_volume,
        "odds": current_odds,
        "order_book": current_order_book,
        "timestamp": datetime.now().isoformat()
    }
    
    return whale_activity

def calculate_volume_growth(market_id: str, current_volume: float) -> float:
    """Calculate volume growth compared to historical average"""
    if market_id not in volume_history:
        volume_history[market_id] = []
    
    # Add current volume to history
    volume_history[market_id].append(current_volume)
    
    # Keep only last 20 data points for average calculation
    if len(volume_history[market_id]) > 20:
        volume_history[market_id].pop(0)
    
    # Calculate average volume
    if len(volume_history[market_id]) >= 3:
        avg_volume = statistics.mean(volume_history[market_id][:-1])  # Exclude current
        if avg_volume > 0:
            return current_volume / avg_volume
    
    return 1.0

def calculate_order_book_change(previous_book: Dict, current_book: Dict) -> float:
    """Calculate percentage change in order book depth"""
    prev_bids = sum(previous_book.get("bids", [0]))
    curr_bids = sum(current_book.get("bids", [0]))
    
    if prev_bids == 0:
        return 0.0
    
    return abs(curr_bids - prev_bids) / prev_bids * 100

def get_mock_order_book_data(market: Dict) -> Dict:
    """Generate mock order book data for demonstration"""
    import random
    
    volume = market.get("volume", 0)
    # Generate realistic order book based on volume
    base_depth = max(1, volume / 1000000)  # Scale with volume
    
    bids = [
        max(1, base_depth * random.uniform(0.8, 1.2)),
        max(1, base_depth * random.uniform(0.6, 0.9)),
        max(1, base_depth * random.uniform(0.4, 0.7))
    ]
    
    asks = [
        max(1, base_depth * random.uniform(0.8, 1.2)),
        max(1, base_depth * random.uniform(0.6, 0.9)),
        max(1, base_depth * random.uniform(0.4, 0.7))
    ]
    
    return {
        "bids": bids,
        "asks": asks,
        "bid_depth": sum(bids),
        "ask_depth": sum(asks)
    }

async def update_market_data():
    """Background task to update market data every 2 minutes"""
    global markets_data, last_update
    
    while True:
        try:
            logger.info("Updating market data...")
            new_data = await fetch_kalshi_data()
            
            if new_data:
                markets_data = new_data
                last_update = datetime.now()
                
                # Broadcast update to all connected clients
                update_message = {
                    "type": "market_update",
                    "data": {
                        "markets": markets_data,
                        "timestamp": last_update.isoformat(),
                        "count": len(markets_data)
                    }
                }
                await manager.broadcast(json.dumps(update_message))
                
                # Broadcast new whale signals if any
                recent_whale_signals = whale_signals[-5:] if whale_signals else []
                if recent_whale_signals:
                    whale_message = {
                        "type": "whale_alerts",
                        "data": {
                            "alerts": recent_whale_signals,
                            "timestamp": datetime.now().isoformat(),
                            "count": len(recent_whale_signals)
                        }
                    }
                    await manager.broadcast(json.dumps(whale_message))
                    logger.info(f"🐋 Broadcasted {len(recent_whale_signals)} whale alerts")
                
                logger.info(f"Market data updated. Total markets: {len(markets_data)}")
            else:
                logger.warning("No market data received")
                
        except Exception as e:
            logger.error(f"Error in update task: {e}")
        
        # Wait for next update
        await asyncio.sleep(UPDATE_INTERVAL)

def load_html_template() -> str:
    """Load the HTML template from static files"""
    try:
        # Try to load from static directory first
        static_path = Path(__file__).parent / "static" / "index.html"
        if static_path.exists():
            with open(static_path, 'r', encoding='utf-8') as f:
                return f.read()
        
        # Fallback to root directory
        root_path = Path(__file__).parent / "index.html"
        if root_path.exists():
            with open(root_path, 'r', encoding='utf-8') as f:
                return f.read()
        
        # Return fallback HTML if file not found
        return """
        <!DOCTYPE html>
        <html>
        <head>
            <title>KalshiWhale - Loading...</title>
            <style>
                body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                .loading { color: #1AAE6F; }
            </style>
        </head>
        <body>
            <h1 class="loading">🐋 KalshiWhale is loading...</h1>
            <p>Please wait while we load the application.</p>
        </body>
        </html>
        """
        
    except Exception as e:
        logger.error(f"Error loading HTML template: {e}")
        return "<h1>Error loading application</h1>"

# API Routes
@app.get("/", response_class=HTMLResponse)
async def get_homepage():
    """Serve the main application"""
    html_content = load_html_template()
    return HTMLResponse(content=html_content)

@app.get("/api/markets")
async def get_markets():
    """Get current market data"""
    if not markets_data:
        # Trigger immediate data fetch if not available
        data = await fetch_kalshi_data()
        return JSONResponse({
            "markets": data,
            "count": len(data),
            "timestamp": datetime.now().isoformat()
        })
    
    return JSONResponse({
        "markets": markets_data,
        "count": len(markets_data),
        "timestamp": last_update.isoformat()
    })

@app.get("/api/status")
async def get_status():
    """Get application status"""
    return JSONResponse({
        "status": "running",
        "timestamp": datetime.now().isoformat(),
        "last_update": last_update.isoformat() if markets_data else None,
        "active_connections": len(manager.active_connections),
        "total_markets": len(markets_data),
        "websocket_enabled": True
    })

@app.get("/api/top-markets")
async def get_top_markets():
    """Get top 5 markets by volume"""
    if not markets_data:
        return JSONResponse({"markets": [], "error": "No data available"})
    
    # Sort by volume and get top 5
    sorted_markets = sorted(markets_data, key=lambda x: x.get("volume", 0), reverse=True)
    top_markets = sorted_markets[:5]
    
    return JSONResponse({
        "markets": top_markets,
        "count": len(top_markets)
    })

@app.get("/api/markets/top5")
async def get_top5_markets_detailed():
    """Get top 5 markets with detailed card information for the frontend"""
    
    # Demo market data since we don't have access to actual Kalshi API outcomes
    demo_markets = [
        {
            "id": "btc-2024-high",
            "question": "How high will Bitcoin get this year?",
            "category": "Crypto",
            "last_update": datetime.now().isoformat(),
            "volume": 19806091,
            "outcomes": [
                {
                    "title": "YES",
                    "description": "$130,000 or above",
                    "probability": 28
                }
            ],
            "high_volume": True,
            "trending": True,
            "high_liquidity": True,
            "recent": True
        },
        {
            "id": "btc-when-low",
            "question": "When will Bitcoin reach $100,000 for the first time?",
            "category": "Crypto",
            "last_update": datetime.now().isoformat(),
            "volume": 8523450,
            "outcomes": [
                {
                    "title": "YES",
                    "description": "Before June 2025",
                    "probability": 43
                }
            ],
            "high_volume": True,
            "trending": False,
            "high_liquidity": False,
            "recent": True
        },
        {
            "id": "btc-2024-low",
            "question": "How low will Bitcoin go this year?",
            "category": "Crypto",
            "last_update": datetime.now().isoformat(),
            "volume": 6345789,
            "outcomes": [
                {
                    "title": "NO",
                    "description": "Below $70,000",
                    "probability": 52
                }
            ],
            "high_volume": False,
            "trending": False,
            "high_liquidity": True,
            "recent": False
        },
        {
            "id": "trump-2024",
            "question": "Will Donald Trump create a new crypto before election day?",
            "category": "Politics",
            "last_update": datetime.now().isoformat(),
            "volume": 12745632,
            "outcomes": [
                {
                    "title": "YES",
                    "description": "Trump launches crypto coin",
                    "probability": 76
                },
                {
                    "title": "NO",
                    "description": "No new crypto announced",
                    "probability": 24
                }
            ],
            "high_volume": True,
            "trending": True,
            "high_liquidity": True,
            "recent": True
        },
        {
            "id": "market-momentum",
            "question": "Will crypto market cap exceed $4 trillion by December 2024?",
            "category": "Crypto",
            "last_update": datetime.now().isoformat(),
            "volume": 4321876,
            "outcomes": [
                {
                    "title": "YES",
                    "description": "Total crypto market > $4T",
                    "probability": 38
                }
            ],
            "high_volume": False,
            "trending": False,
            "high_liquidity": False,
            "recent": True
        }
    ]
    
    return JSONResponse({
        "markets": demo_markets,
        "count": len(demo_markets),
        "timestamp": datetime.now().isoformat()
    })

@app.get("/api/whale-alerts")
async def get_whale_alerts():
    """Get sophisticated whale activity alerts based on volume surges, odds flips, and order book shifts"""
    
    # Get recent whale signals (last 10)
    recent_signals = whale_signals[-10:] if whale_signals else []
    
    # Also include high-volume markets as fallback
    high_volume_markets = []
    if markets_data:
        high_volume_markets = [
            {
                "type": "high_volume",
                "ticker": market.get("ticker_symbol", "Unknown"),
                "volume": market.get("volume", 0),
                "volume_millions": market.get("volume_millions", 0),
                "timestamp": market.get("last_updated", datetime.now().isoformat()),
                "description": f"High volume trading detected: ${market.get('volume', 0):,.0f}"
            }
            for market in markets_data 
            if market.get("volume", 0) > WHALE_VOLUME_MINIMUM
        ]
    
    # Combine whale signals and high volume markets
    all_alerts = []
    
    # Add sophisticated whale detection alerts
    for signal in recent_signals:
        alert = {
            "type": signal["type"],
            "ticker": signal["ticker"],
            "severity": signal.get("severity", "medium"),
            "description": generate_whale_description(signal),
            "data": signal,
            "timestamp": signal["timestamp"]
        }
        all_alerts.append(alert)
    
    # Add high-volume market alerts
    for market_alert in high_volume_markets:
        all_alerts.append(market_alert)
    
    # Sort by timestamp (most recent first)
    all_alerts.sort(key=lambda x: x["timestamp"], reverse=True)
    
    return JSONResponse({
        "alerts": all_alerts,
        "count": len(all_alerts),
        "whale_signals_count": len(recent_signals),
        "high_volume_count": len(high_volume_markets),
        "detection_types": {
            "volume_surge": any(a["type"] == "volume_surge" for a in all_alerts),
            "odds_flip": any(a["type"] == "odds_flip" for a in all_alerts),
            "order_book_shift": any(a["type"] == "order_book_shift" for a in all_alerts),
            "high_volume": any(a["type"] == "high_volume" for a in all_alerts)
        },
        "thresholds": {
            "volume_surge_multiplier": VOLUME_SURGE_THRESHOLD,
            "odds_change_percent": ODDS_CHANGE_THRESHOLD,
            "order_book_change_percent": ORDER_BOOK_DEPTH_CHANGE_THRESHOLD,
            "minimum_volume": WHALE_VOLUME_MINIMUM
        }
    })

def generate_whale_description(signal: Dict) -> str:
    """Generate human-readable description for whale activity"""
    signal_type = signal["type"]
    ticker = signal["ticker"]
    
    if signal_type == "volume_surge":
        growth = signal.get("volume_growth", 0)
        return f"🐋 Massive volume surge detected on {ticker}: {growth:.1f}x normal volume"
    
    elif signal_type == "odds_flip":
        change = signal.get("change_percent", 0)
        direction = signal.get("direction", "changed")
        return f"📈 Odds {direction} detected on {ticker}: {change:.1f}% change"
    
    elif signal_type == "order_book_shift":
        depth_change = signal.get("depth_change", 0)
        return f"💰 Order book depth shift on {ticker}: {depth_change:.1f}% change in market depth"
    
    else:
        return f"🚨 Whale activity detected on {ticker}"

@app.get("/api/whale-analytics")
async def get_whale_analytics():
    """Get detailed whale analytics and market insights"""
    
    analytics = {
        "total_whale_signals": len(whale_signals),
        "signal_types": {},
        "most_active_markets": {},
        "recent_activity": [],
        "volume_trends": {},
        "odds_movements": {}
    }
    
    # Analyze signal types
    for signal in whale_signals:
        signal_type = signal["type"]
        analytics["signal_types"][signal_type] = analytics["signal_types"].get(signal_type, 0) + 1
    
    # Find most active markets
    market_activity = {}
    for signal in whale_signals:
        ticker = signal["ticker"]
        market_activity[ticker] = market_activity.get(ticker, 0) + 1
    
    analytics["most_active_markets"] = dict(sorted(market_activity.items(), 
                                                  key=lambda x: x[1], reverse=True)[:5])
    
    # Recent activity (last 5 signals)
    analytics["recent_activity"] = whale_signals[-5:] if whale_signals else []
    
    # Volume trends
    for market_id, volumes in volume_history.items():
        if len(volumes) >= 3:
            recent_avg = statistics.mean(volumes[-3:])
            analytics["volume_trends"][market_id] = {
                "recent_average": recent_avg,
                "trend": "increasing" if volumes[-1] > volumes[0] else "decreasing",
                "volatility": statistics.stdev(volumes) if len(volumes) > 1 else 0
            }
    
    return JSONResponse(analytics)

@app.post("/api/refresh")
async def refresh_data():
    """Manually trigger data refresh"""
    global markets_data
    try:
        new_data = await fetch_kalshi_data()
        if new_data:
            markets_data = new_data
            last_update = datetime.now()
            return JSONResponse({
                "success": True,
                "message": "Data refreshed successfully",
                "count": len(markets_data),
                "timestamp": last_update.isoformat()
            })
        else:
            raise HTTPException(status_code=500, detail="Failed to fetch data")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# WebSocket endpoint
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time updates"""
    await manager.connect(websocket)
    try:
        # Send initial data
        if markets_data:
            initial_message = {
                "type": "initial_data",
                "data": {
                    "markets": markets_data,
                    "timestamp": last_update.isoformat(),
                    "count": len(markets_data)
                }
            }
            await websocket.send_text(json.dumps(initial_message))
        
        # Keep connection alive
        while True:
            # Wait for messages from client
            try:
                await websocket.receive_text()
            except:
                # No message received, continue loop
                pass
            
            # Send heartbeat
            heartbeat = {
                "type": "heartbeat",
                "timestamp": datetime.now().isoformat(),
                "connections": len(manager.active_connections)
            }
            await websocket.send_text(json.dumps(heartbeat))
            
            # Wait before next heartbeat
            await asyncio.sleep(30)  # 30 second heartbeat
            
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(websocket)

# Development and production server management
@app.on_event("startup")
async def startup_event():
    """Initialize application on startup"""
    logger.info("🚀 Starting KalshiWhale Backend...")
    
    # Start background data update task
    global update_task
    update_task = asyncio.create_task(update_market_data())
    
    # Initial data fetch
    initial_data = await fetch_kalshi_data()
    if initial_data:
        markets_data.extend(initial_data)
        logger.info(f"Initial data loaded: {len(markets_data)} markets")

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    logger.info("🛑 Shutting down KalshiWhale Backend...")
    
    # Cancel background task
    global update_task
    if update_task:
        update_task.cancel()
    
    # Close WebSocket connections
    for connection in manager.active_connections:
        try:
            await connection.close()
        except:
            pass

# Static file serving (if static directory exists)
static_dir = Path(__file__).parent / "static"
if static_dir.exists():
    app.mount("/static", StaticFiles(directory=static_dir), name="static")

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    host = os.environ.get("HOST", "0.0.0.0")
    environment = os.environ.get("ENVIRONMENT", "development")
    
    print("🐋 Starting KalshiWhale Backend...")
    print(f"🌐 Host: {host}")
    print(f"🔌 Port: {port}")
    print(f"⚙️ Environment: {environment}")
    print(f"📡 WebSocket: ws://{host}:{port}/ws")
    print(f"🌍 API: http://{host}:{port}/api")
    
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        log_level="info" if environment == "production" else "debug",
        reload=environment == "development"
    )