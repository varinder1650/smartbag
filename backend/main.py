from fastapi import FastAPI, HTTPException, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from fastapi.security import HTTPBearer
from contextlib import asynccontextmanager
import motor.motor_asyncio
import os
import time
import logging
from pathlib import Path
from dotenv import load_dotenv
import uvicorn
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from routes import auth, products, categories, brands, cart, orders, upload, user, address, settings, geocoding

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Rate limiter
limiter = Limiter(key_func=get_remote_address)

# Security
security = HTTPBearer()

# MongoDB connection
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/blinkit_clone")
client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_URI)
db = client.blinkit_clone

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting up the backend server...")
    try:
        # Test MongoDB connection
        await client.admin.command('ping')
        logger.info("MongoDB connected successfully")
    except Exception as e:
        logger.error(f"MongoDB connection error: {e}")
        raise e
    
    yield
    
    # Shutdown
    logger.info("Shutting down backend server...")
    client.close()

# Create FastAPI app
app = FastAPI(
    title="SmartBag",
    description="Quick Commerce Application(SmartBag)",
    version="1.0.0",
    lifespan=lifespan
)

# Add rate limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Security middleware
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["*"]
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Performance monitoring middleware
@app.middleware("http")
async def performance_monitoring(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    duration = time.time() - start_time
    logger.info(f"{request.method} {request.url.path} - {response.status_code} - {duration:.3f}s")
    return response

# Mount static files for uploads
uploads_dir = Path("uploads")
uploads_dir.mkdir(exist_ok=True)
app.mount("/api/uploads", StaticFiles(directory="uploads"), name="uploads")

# Import routes
from routes import auth, products, categories, brands, cart, orders, upload, user, address, settings

# Include routes
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(products.router, prefix="/api/products", tags=["Products"])
app.include_router(categories.router, prefix="/api/categories", tags=["Categories"])
app.include_router(brands.router, prefix="/api/brands", tags=["Brands"])
app.include_router(cart.router, prefix="/api/cart", tags=["Cart"])
app.include_router(orders.router, prefix="/api/orders", tags=["Orders"])
app.include_router(upload.router, prefix="/api/upload", tags=["Upload"])
app.include_router(user.router, prefix="/api/user", tags=["User"])
app.include_router(address.router, prefix="/api/address", tags=["Address"])
app.include_router(settings.router, prefix="/api/settings", tags=["Settings"])
app.include_router(geocoding.router, prefix="/api", tags=["Geocoding"])
# Root route
@app.get("/")
async def root():
    return {"message": "Backend is running..."}

# Health check route
@app.get("/api/health")
@limiter.limit("100/minute")
async def health_check(request: Request):
    logger.info(f"Health check requested from: {request.client.host}")
    return {
        "status": "ok",
        "timestamp": time.time(),
        "message": "Backend is running successfully",
        "clientIP": request.client.host,
        "userAgent": request.headers.get("user-agent")
    }

# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global Error Handler: {exc}")
    
    if isinstance(exc, ValueError):
        return JSONResponse(
            status_code=400,
            content={"message": "Validation Error", "error": str(exc)}
        )
    
    return JSONResponse(
        status_code=500,
        content={
            "message": "Internal server error",
            "error": str(exc) if os.getenv("ENVIRONMENT") == "development" else None
        }
    )

# 404 handler
@app.exception_handler(404)
async def not_found_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=404,
        content={"message": "Route not found"}
    )

if __name__ == "__main__":
    port = int(os.getenv("PORT", 3001))
    environment = os.getenv("ENVIRONMENT", "development")
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=environment == "development",
        log_level="info",
        access_log=True,
        # SCALABILITY: Production server settings
        workers=1 if environment == "development" else 4,
        loop="asyncio",
        http="httptools",
        lifespan="on"
    )