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
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="KalshiWhale - Crypto Whale Tracker",
    description="Real-time Crypto Whale Tracker for Kalshi Prediction Markets",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

KALSHI_API_BASE = os.environ.get("KALSHI_API_BASE", "https://api.elections.kalshi.com/trade-api/v2")
UPDATE_INTERVAL = int(os.environ.get("UPDATE_INTERVAL_SECONDS", 120))

markets_data: List[Dict] = []
websocket_connections: List[WebSocket] = []
last_update: datetime = datetime.now()
update_task: Optional[asyncio.Task] = None

historical_data: Dict[str, Dict] = {}
whale_signals: List[Dict] = []
order_book_changes: Dict[str, Dict] = {}
volume_history: Dict[str, List[float]] = {}
odds_history: Dict[str, List[float]] = {}

VOLUME_SURGE_THRESHOLD = 3.0
ODDS_CHANGE_THRESHOLD = 15.0
ORDER_BOOK_DEPTH_CHANGE_THRESHOLD = 25.0
WHALE_VOLUME_MINIMUM = 1000000
CRYPTO_KEYWORDS = ["btc", "eth", "crypto", "bitcoin", "ethereum", "sol", "solana", "bch"]

class ConnectionManager:
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
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except:
                disconnected.append(connection)
        
        for conn in disconnected:
            if conn in self.active_connections:
                self.active_connections.remove(conn)

manager = ConnectionManager()

async def fetch_kalshi_data() -> List[Dict]:
    all_markets = []
    cursor = None
    
    try:
        while True:
            url = f"{KALSHI_API_BASE}/markets?status=open&limit=100"
            if cursor:
                url += f"&cursor={cursor}"
                
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            markets = data.get("markets", [])
            all_markets.extend(markets)
            
            cursor = data.get("cursor")
            if not cursor or not markets:
                break
            
            await asyncio.sleep(0.5)

        logger.info(f"Fetched a total of {len(all_markets)} open markets from all pages.")

        crypto_markets = []
        whale_activities = []
        
        for market in all_markets:
            ticker = market.get("ticker_symbol", "").lower()
            title = market.get("title", "").lower()
            
            is_crypto_market = any(keyword in ticker for keyword in CRYPTO_KEYWORDS) or \
                               any(keyword in title for keyword in CRYPTO_KEYWORDS)

            if is_crypto_market:
                market_id = market.get("id", ticker)
                
                market["volume_millions"] = market.get("volume", 0) / 1000000
                market["last_updated"] = datetime.now().isoformat()
                
                whale_activity = detect_whale_activity(market_id, market)
                if whale_activity:
                    whale_activities.append(whale_activity)
                    logger.info(f"🐋 Whale detected: {whale_activity['type']} on {ticker}")
                
                crypto_markets.append(market)
        
        if whale_activities:
            whale_signals.extend(whale_activities)
            whale_signals[:] = whale_signals[-100:]
        
        logger.info(f"Found {len(crypto_markets)} crypto markets, detected {len(whale_activities)} whale activities")
        return crypto_markets
        
    except requests.exceptions.HTTPError as http_err:
        logger.error(f"HTTP error fetching Kalshi data: {http_err} - Response: {http_err.response.text}")
    except Exception as e:
        logger.error(f"Error fetching Kalshi data: {e}")
    
    return []

def detect_whale_activity(market_id: str, current_market: Dict) -> Optional[Dict]:
    current_volume = current_market.get("volume", 0)
    current_odds = current_market.get("close_price", current_market.get("value", 50))
    
    if market_id not in historical_data:
        historical_data[market_id] = {
            "volume": current_volume,
            "odds": current_odds,
            "order_book": get_mock_order_book_data(current_market),
            "timestamp": datetime.now().isoformat()
        }
        return None
    
    previous_data = historical_data[market_id]
    previous_volume = previous_data["volume"]
    previous_odds = previous_data["odds"]
    previous_order_book = previous_data.get("order_book", {})
    
    whale_activity = None
    
    if current_volume > WHALE_VOLUME_MINIMUM:
        volume_growth = calculate_volume_growth(market_id, current_volume)
        if volume_growth >= VOLUME_SURGE_THRESHOLD:
            whale_activity = {
                "id": f"vol_{market_id}_{datetime.now().timestamp()}",
                "type": "volume_surge",
                "market_id": market_id,
                "ticker": current_market.get("ticker_symbol", "Unknown"),
                "confidence": 85,
                "market_impact": "high",
                "description": "Volume surge detected",
                "data": {
                    "current_value": current_volume,
                    "previous_value": previous_volume,
                    "growth_multiple": volume_growth
                },
                "timestamp": datetime.now().isoformat(),
                "severity": "high" if volume_growth >= 5.0 else "medium"
            }
    
    if abs(current_odds - previous_odds) >= ODDS_CHANGE_THRESHOLD:
        odds_change_percent = abs(current_odds - previous_odds)
        direction = "up" if current_odds > previous_odds else "down"
        
        whale_activity = {
            "id": f"odds_{market_id}_{datetime.now().timestamp()}",
            "type": "odds_flip",
            "market_id": market_id,
            "ticker": current_market.get("ticker_symbol", "Unknown"),
            "confidence": 75,
            "market_impact": "medium",
            "description": "Odds flip detected",
            "data": {
                "current_value": current_odds,
                "previous_value": previous_odds,
                "change_percent": odds_change_percent,
                "direction": direction
            },
            "timestamp": datetime.now().isoformat(),
            "severity": "high" if odds_change_percent >= 25.0 else "medium"
        }
    
    current_order_book = get_mock_order_book_data(current_market)
    order_book_change = calculate_order_book_change(previous_order_book, current_order_book)
    
    if order_book_change >= ORDER_BOOK_DEPTH_CHANGE_THRESHOLD:
        whale_activity = {
            "id": f"book_{market_id}_{datetime.now().timestamp()}",
            "type": "order_book_shift",
            "market_id": market_id,
            "ticker": current_market.get("ticker_symbol", "Unknown"),
            "confidence": 70,
            "market_impact": "medium",
            "description": "Order book shift detected",
            "data": {
                "change_percent": order_book_change,
                "previous_value": sum(previous_order_book.get("bids", [0])),
                "current_value": sum(current_order_book.get("bids", [0]))
            },
            "timestamp": datetime.now().isoformat(),
            "severity": "high" if order_book_change >= 50.0 else "medium"
        }
    
    historical_data[market_id] = {
        "volume": current_volume,
        "odds": current_odds,
        "order_book": current_order_book,
        "timestamp": datetime.now().isoformat()
    }
    
    return whale_activity

def calculate_volume_growth(market_id: str, current_volume: float) -> float:
    if market_id not in volume_history:
        volume_history[market_id] = []
    
    volume_history[market_id].append(current_volume)
    
    if len(volume_history[market_id]) > 20:
        volume_history[market_id].pop(0)
    
    if len(volume_history[market_id]) >= 3:
        avg_volume = statistics.mean(volume_history[market_id][:-1])
        if avg_volume > 0:
            return current_volume / avg_volume
    
    return 1.0

def calculate_order_book_change(previous_book: Dict, current_book: Dict) -> float:
    prev_bids = sum(previous_book.get("bids", [0]))
    curr_bids = sum(current_book.get("bids", [0]))
    
    if prev_bids == 0:
        return 0.0
    
    return abs(curr_bids - prev_bids) / prev_bids * 100

def get_mock_order_book_data(market: Dict) -> Dict:
    import random
    
    volume = market.get("volume", 0)
    base_depth = max(1, volume / 1000000)
    
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
    global markets_data, last_update
    
    await asyncio.sleep(5)
    
    while True:
        try:
            logger.info("Updating market data...")
            new_data = await fetch_kalshi_data()
            
            if new_data:
                markets_data = new_data
                last_update = datetime.now()
                
                update_message = {
                    "type": "market_update",
                    "data": {
                        "markets": markets_data,
                        "timestamp": last_update.isoformat(),
                        "count": len(markets_data)
                    }
                }
                await manager.broadcast(json.dumps(update_message))
                
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
        
        await asyncio.sleep(UPDATE_INTERVAL)

def load_html_template() -> str:
    try:
        static_path = Path(__file__).parent / "static" / "index.html"
        if static_path.exists():
            with open(static_path, 'r', encoding='utf-8') as f:
                return f.read()
        
        root_path = Path(__file__).parent / "index.html"
        if root_path.exists():
            with open(root_path, 'r', encoding='utf-8') as f:
                return f.read()
        
        return """
        <!DOCTYPE html>
        <html>
        <head>
            <title>KalshiWhale - Loading...</title>
        </head>
        <body>
            <h1>🐋 KalshiWhale Backend is running.</h1>
            <p>This is the backend. Access the frontend application to see data.</p>
        </body>
        </html>
        """
        
    except Exception as e:
        logger.error(f"Error loading HTML template: {e}")
        return "<h1>Error loading application</h1>"

@app.get("/", response_class=HTMLResponse)
async def get_homepage():
    html_content = load_html_template()
    return HTMLResponse(content=html_content)

@app.get("/api/markets")
async def get_markets():
    if not markets_data:
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
    if not markets_data:
        return JSONResponse({"markets": [], "error": "No data available"})
    
    sorted_markets = sorted(markets_data, key=lambda x: x.get("volume", 0), reverse=True)
    top_markets = sorted_markets[:5]
    
    return JSONResponse({
        "markets": top_markets,
        "count": len(top_markets)
    })

@app.get("/api/markets/top5")
async def get_top5_markets_detailed():
    if not markets_data:
        data = await fetch_kalshi_data()
    else:
        data = markets_data

    sorted_markets = sorted(data, key=lambda x: x.get("volume", 0), reverse=True)
    top_markets = sorted_markets[:5]

    response_markets = []
    for market in top_markets:
        response_markets.append({
            "id": market.get("id", market.get("ticker_symbol")),
            "question": market.get("title", "N/A"),
            "category": market.get("category_name", "Crypto"),
            "last_update": market.get("last_updated"),
            "volume": market.get("volume", 0),
            "cadence": market.get("frequency", "Annually"),
            "trending": market.get("volume", 0) > 1000000,
            "outcomes": [
                {
                    "title": "YES",
                    "description": "YES outcome",
                    "probability": market.get("close_price", 50) / 100
                },
                {
                    "title": "NO", 
                    "description": "NO outcome",
                    "probability": 1 - (market.get("close_price", 50) / 100)
                }
            ],
            "high_volume": market.get("volume", 0) > WHALE_VOLUME_MINIMUM,
            "high_liquidity": market.get("liquidity", 0) > 50000,
            "recent": True,
            "status": market.get("status", "open"),
            "ticker_symbol": market.get("ticker_symbol")
        })
    
    return JSONResponse({
        "markets": response_markets,
        "count": len(response_markets),
        "timestamp": datetime.now().isoformat()
    })

@app.get("/api/whale-alerts")
async def get_whale_alerts():
    recent_signals = whale_signals[-10:] if whale_signals else []
    
    high_volume_markets = []
    if markets_data:
        high_volume_markets = [
            {
                "id": f"hv_{market.get('id')}",
                "type": "high_volume",
                "ticker": market.get("ticker_symbol", "Unknown"),
                "severity": "medium",
                "confidence": 80,
                "market_impact": "high",
                "data": {
                    "current_value": market.get("volume", 0),
                },
                "timestamp": market.get("last_updated", datetime.now().isoformat()),
                "description": f"High volume trading detected: ${market.get('volume', 0):,.0f}"
            }
            for market in markets_data 
            if market.get("volume", 0) > WHALE_VOLUME_MINIMUM
        ]
    
    all_alerts_dict = {alert["id"]: alert for alert in recent_signals}
    for alert in high_volume_markets:
        if alert["id"] not in all_alerts_dict:
            all_alerts_dict[alert["id"]] = alert
    
    all_alerts = list(all_alerts_dict.values())
    all_alerts.sort(key=lambda x: x["timestamp"], reverse=True)
    
    return JSONResponse({
        "data": {
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
        },
        "timestamp": datetime.now().isoformat(),
        "status": "success"
    })

def generate_whale_description(signal: Dict) -> str:
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
    analytics = {
        "total_whale_signals": len(whale_signals),
        "signal_types": {},
        "most_active_markets": {},
        "recent_activity": [],
        "volume_trends": {},
        "odds_movements": {}
    }
    
    for signal in whale_signals:
        signal_type = signal["type"]
        analytics["signal_types"][signal_type] = analytics["signal_types"].get(signal_type, 0) + 1
    
    market_activity = {}
    for signal in whale_signals:
        ticker = signal["ticker"]
        market_activity[ticker] = market_activity.get(ticker, 0) + 1
    
    analytics["most_active_markets"] = dict(sorted(market_activity.items(), 
                                                  key=lambda x: x[1], reverse=True)[:5])
    
    analytics["recent_activity"] = whale_signals[-5:] if whale_signals else []
    
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

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
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
        
        while True:
            try:
                await websocket.receive_text()
            except:
                pass
            
            heartbeat = {
                "type": "heartbeat",
                "timestamp": datetime.now().isoformat(),
                "connections": len(manager.active_connections)
            }
            await websocket.send_text(json.dumps(heartbeat))
            
            await asyncio.sleep(30)
            
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(websocket)

@app.on_event("startup")
async def startup_event():
    logger.info("🚀 Starting KalshiWhale Backend...")
    
    global update_task
    update_task = asyncio.create_task(update_market_data())
    
    initial_data = await fetch_kalshi_data()
    if initial_data:
        markets_data.extend(initial_data)
        logger.info(f"Initial data loaded: {len(markets_data)} markets")

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("🛑 Shutting down KalshiWhale Backend...")
    
    global update_task
    if update_task:
        update_task.cancel()
    
    for connection in manager.active_connections:
        try:
            await connection.close()
        except:
            pass

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