#!/usr/bin/env python3
"""
KalshiWhale Backend API Test Suite

This script tests all API endpoints to ensure they're working correctly.
Run this to verify your backend setup.

Usage:
    python test_api.py
"""

import requests
import json
import time
import websocket
import threading
from datetime import datetime

# Configuration
BASE_URL = "http://localhost:8000"
WS_URL = "ws://localhost:8000/ws"

class APITester:
    def __init__(self):
        self.base_url = BASE_URL
        self.ws_url = WS_URL
        self.test_results = []
    
    def log(self, message):
        """Log test results"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {message}")
    
    def test_endpoint(self, name, url, method="GET", data=None):
        """Test a single API endpoint"""
        try:
            self.log(f"Testing {name}...")
            
            if method == "GET":
                response = requests.get(url, timeout=10)
            elif method == "POST":
                response = requests.post(url, json=data, timeout=10)
            else:
                raise ValueError(f"Unsupported method: {method}")
            
            if response.status_code == 200:
                self.log(f"✅ {name} - SUCCESS ({response.status_code})")
                return True, response.json()
            else:
                self.log(f"❌ {name} - FAILED ({response.status_code})")
                return False, response.text
                
        except requests.exceptions.RequestException as e:
            self.log(f"❌ {name} - ERROR: {e}")
            return False, str(e)
        except Exception as e:
            self.log(f"❌ {name} - UNEXPECTED ERROR: {e}")
            return False, str(e)
    
    def test_websocket(self):
        """Test WebSocket connection"""
        self.log("Testing WebSocket connection...")
        
        def on_message(ws, message):
            try:
                data = json.loads(message)
                self.log(f"✅ WebSocket message received: {data.get('type', 'unknown')}")
                ws.close()
            except Exception as e:
                self.log(f"❌ WebSocket message error: {e}")
        
        def on_error(ws, error):
            self.log(f"❌ WebSocket error: {error}")
        
        def on_open(ws):
            self.log("✅ WebSocket connected successfully")
        
        def on_close(ws, close_status_code, close_msg):
            self.log("✅ WebSocket closed")
        
        try:
            ws = websocket.WebSocketApp(
                self.ws_url,
                on_message=on_message,
                on_error=on_error,
                on_open=on_open,
                on_close=on_close
            )
            
            # Run WebSocket in a separate thread
            ws_thread = threading.Thread(target=ws.run_forever)
            ws_thread.daemon = True
            ws_thread.start()
            
            # Wait for connection
            time.sleep(2)
            return True
            
        except Exception as e:
            self.log(f"❌ WebSocket connection failed: {e}")
            return False
    
    def run_all_tests(self):
        """Run all API tests"""
        self.log("🚀 Starting API Tests...")
        self.log("=" * 50)
        
        # Test 1: Health Check
        success, data = self.test_endpoint("Health Check", f"{self.base_url}/api/status")
        if success:
            self.log(f"   Server status: {data.get('status', 'unknown')}")
            self.log(f"   Active connections: {data.get('active_connections', 0)}")
        
        # Test 2: Markets API
        success, data = self.test_endpoint("Markets API", f"{self.base_url}/api/markets")
        if success:
            self.log(f"   Total markets: {data.get('count', 0)}")
            if data.get('markets'):
                self.log(f"   Sample market: {data['markets'][0].get('ticker_symbol', 'N/A')}")
        
        # Test 3: Top Markets API
        success, data = self.test_endpoint("Top Markets", f"{self.base_url}/api/top-markets")
        if success:
            self.log(f"   Top markets count: {data.get('count', 0)}")
        
        # Test 4: Whale Alerts API
        success, data = self.test_endpoint("Whale Alerts", f"{self.base_url}/api/whale-alerts")
        if success:
            self.log(f"   Whale alerts count: {data.get('count', 0)}")
        
        # Test 5: Manual Refresh
        success, data = self.test_endpoint("Manual Refresh", f"{self.base_url}/api/refresh", "POST")
        if success:
            self.log(f"   Refresh message: {data.get('message', 'N/A')}")
        
        # Test 6: WebSocket
        self.test_websocket()
        
        # Test 7: Frontend
        success, data = self.test_endpoint("Frontend", f"{self.base_url}/")
        if success and isinstance(data, str):
            if "KalshiWhale" in data:
                self.log("   Frontend contains expected content")
            else:
                self.log("   ⚠️ Frontend content might be incomplete")
        
        self.log("=" * 50)
        self.log("🏁 API Tests Complete!")

def main():
    """Main function"""
    print("🐋 KalshiWhale Backend API Test")
    print("=" * 50)
    
    # Check if server is running
    try:
        response = requests.get(f"{BASE_URL}/api/status", timeout=5)
        if response.status_code != 200:
            print("❌ Server is not responding correctly")
            print(f"   Status code: {response.status_code}")
            print("   Make sure the backend is running on port 8000")
            return
    except requests.exceptions.RequestException:
        print("❌ Cannot connect to server")
        print("   Make sure the backend is running on port 8000")
        print("   Run: python main.py")
        return
    
    print("✅ Server is running!")
    print()
    
    # Run tests
    tester = APITester()
    tester.run_all_tests()

if __name__ == "__main__":
    main()