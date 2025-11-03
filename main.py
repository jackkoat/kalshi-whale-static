import os
import json
import asyncio
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
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
    """Fetch data from Kalshi API"""
    try:
        # Fetch open crypto markets
        url = f"{KALSHI_API_BASE}/markets?status=open&limit=200"
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        
        data = response.json()
        markets = data.get("markets", [])
        
        # Filter for crypto-related markets
        crypto_markets = []
        for market in markets:
            ticker = market.get("ticker_symbol", "").lower()
            if any(crypto in ticker for crypto in ["btc", "eth", "crypto", "bitcoin", "ethereum"]):
                # Add derived metrics
                market["volume_millions"] = market.get("volume", 0) / 1000000
                market["last_updated"] = datetime.now().isoformat()
                crypto_markets.append(market)
        
        logger.info(f"Fetched {len(crypto_markets)} crypto markets")
        return crypto_markets
        
    except Exception as e:
        logger.error(f"Error fetching Kalshi data: {e}")
        return []

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

@app.get("/api/whale-alerts")
async def get_whale_alerts():
    """Get markets with high volume (whale activity)"""
    if not markets_data:
        return JSONResponse({"alerts": [], "error": "No data available"})
    
    # Find markets with volume > $1M as whale activity
    whale_markets = [
        market for market in markets_data 
        if market.get("volume", 0) > 1000000
    ]
    
    return JSONResponse({
        "alerts": whale_markets,
        "count": len(whale_markets),
        "threshold": 1000000
    })

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