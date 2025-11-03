#!/usr/bin/env python3
"""
Security Middleware untuk KalshiWhale Backend

Menambahkan layer keamanan tambahan untuk production:
- Rate Limiting
- Input Validation
- Security Headers
- CORS Configuration
"""

from fastapi import FastAPI, Request, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import time
import hashlib
import secrets
from typing import Dict, List, Optional
from collections import defaultdict
import logging
import os
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

class SecurityConfig:
    """Security configuration class"""
    
    def __init__(self):
        self.rate_limit_per_minute = int(os.getenv("RATE_LIMIT_PER_MINUTE", "100"))
        self.allowed_origins = os.getenv("ALLOWED_ORIGINS", "").split(",")
        self.api_key = os.getenv("API_KEY", "")
        self.jwt_secret = os.getenv("JWT_SECRET", "")
        self.max_connections = int(os.getenv("MAX_CONNECTIONS", "1000"))
        self.websocket_timeout = int(os.getenv("WEB_SOCKET_TIMEOUT", "300"))

class RateLimiter:
    """Rate limiter middleware"""
    
    def __init__(self, max_requests: int = 100, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.requests: Dict[str, List[float]] = defaultdict(list)
    
    def is_allowed(self, client_ip: str) -> bool:
        """Check if request is allowed based on rate limiting"""
        now = time.time()
        window_start = now - self.window_seconds
        
        # Clean old requests
        self.requests[client_ip] = [
            req_time for req_time in self.requests[client_ip] 
            if req_time > window_start
        ]
        
        # Check if under limit
        if len(self.requests[client_ip]) >= self.max_requests:
            return False
        
        # Add current request
        self.requests[client_ip].append(now)
        return True

class SecurityMiddleware:
    """Security middleware untuk FastAPI"""
    
    def __init__(self, app: FastAPI):
        self.app = app
        self.config = SecurityConfig()
        self.rate_limiter = RateLimiter(
            max_requests=self.config.rate_limit_per_minute
        )
        
    def add_security_headers(self, request: Request, call_next):
        """Add security headers to response"""
        response = call_next(request)
        
        # Security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Content-Security-Policy"] = "default-src 'self'"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        
        return response
    
    def validate_api_key(self, request: Request) -> bool:
        """Validate API key if configured"""
        if not self.config.api_key:
            return True  # No API key required
        
        api_key = request.headers.get("X-API-Key")
        if not api_key or api_key != self.config.api_key:
            logger.warning(f"Invalid API key attempt from {request.client.host}")
            return False
        
        return True
    
    def add_cors_config(self, app: FastAPI):
        """Add secure CORS configuration"""
        origins = [
            "http://localhost:3000",
            "http://localhost:8000", 
            "https://yourdomain.com",
            # Add your actual domains here
        ] if not self.config.allowed_origins or self.config.allowed_origins[0] == "" else self.config.allowed_origins
        
        app.add_middleware(
            CORSMiddleware,
            allow_origins=origins,
            allow_credentials=True,
            allow_methods=["GET", "POST", "OPTIONS"],
            allow_headers=[
                "Content-Type",
                "Authorization", 
                "X-API-Key",
                "Accept"
            ],
        )
    
    def add_middleware_to_app(self):
        """Add all security middleware to the FastAPI app"""
        
        # Add CORS
        self.add_cors_config(self.app)
        
        # Add rate limiting middleware
        @self.app.middleware("http")
        async def rate_limit_middleware(request: Request, call_next):
            client_ip = request.client.host if request.client else "unknown"
            
            # Skip rate limiting for internal calls
            if client_ip in ["127.0.0.1", "localhost", "::1"]:
                return await call_next(request)
            
            if not self.rate_limiter.is_allowed(client_ip):
                logger.warning(f"Rate limit exceeded for IP: {client_ip}")
                return JSONResponse(
                    status_code=429,
                    content={
                        "error": "Rate limit exceeded",
                        "message": "Too many requests. Please try again later.",
                        "retry_after": 60
                    }
                )
            
            return await call_next(request)
        
        # Add API key validation middleware
        @self.app.middleware("http")
        async def api_key_middleware(request: Request, call_next):
            if not self.validate_api_key(request):
                return JSONResponse(
                    status_code=401,
                    content={
                        "error": "Unauthorized",
                        "message": "Valid API key required"
                    }
                )
            
            return await call_next(request)
        
        # Add security headers middleware
        @self.app.middleware("http")
        async def security_headers_middleware(request: Request, call_next):
            response = await self.call_next(request)
            return self.add_security_headers(request, lambda r: response)

def add_security_middleware(app: FastAPI) -> SecurityMiddleware:
    """Add security middleware to FastAPI app"""
    
    security = SecurityMiddleware(app)
    security.add_middleware_to_app()
    
    # Add custom exception handlers
    @app.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException):
        # Don't leak sensitive info in production
        if os.getenv("ENVIRONMENT") == "production":
            return JSONResponse(
                status_code=exc.status_code,
                content={
                    "error": "An error occurred",
                    "message": "Please check your request and try again"
                }
            )
        else:
            return JSONResponse(
                status_code=exc.status_code,
                content={
                    "error": exc.detail,
                    "message": str(exc)
                }
            )
    
    return security

def validate_input_data(data: dict, schema_type: str) -> bool:
    """Validate input data based on schema type"""
    
    if schema_type == "refresh":
        # Validate refresh endpoint data
        allowed_fields = {"force_update"}
        if not all(field in allowed_fields for field in data.keys()):
            return False
    
    elif schema_type == "websocket":
        # Validate WebSocket message data
        max_message_size = 1024  # 1KB
        message_json = str(data)
        if len(message_json) > max_message_size:
            return False
    
    return True

def generate_api_key() -> str:
    """Generate a secure API key"""
    return secrets.token_urlsafe(32)

def hash_password(password: str, salt: str = None) -> tuple:
    """Hash password with salt for authentication"""
    if salt is None:
        salt = secrets.token_hex(16)
    
    password_hash = hashlib.pbkdf2_hmac(
        'sha256',
        password.encode('utf-8'),
        salt.encode('utf-8'),
        100000  # 100k iterations
    )
    
    return password_hash.hex(), salt

# Usage example untuk main.py:
"""
# Import security module
from security_middleware import add_security_middleware

# Add security middleware
security = add_security_middleware(app)

# Use in environment variables
API_KEY=your-secret-api-key-here
RATE_LIMIT_PER_MINUTE=60
ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com
"""

if __name__ == "__main__":
    # Example usage
    app = FastAPI(title="Secure API Example")
    add_security_middleware(app)
    print("Security middleware added successfully!")
    
    # Generate example API key
    api_key = generate_api_key()
    print(f"Generated API Key: {api_key}")
    
    # Example password hashing
    password = "mypassword123"
    password_hash, salt = hash_password(password)
    print(f"Password Hash: {password_hash}")
    print(f"Salt: {salt}")