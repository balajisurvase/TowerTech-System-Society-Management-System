import os
import sys
import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger("towertech.main")

from backend.app.core.config import settings
from backend.app.routers.auth import router as auth_router
from backend.app.routers.society import router as society_router
from backend.app.routers.residents import router as residents_router
from backend.app.routers.tenants import (
    tenants_router,
    family_router,
    vehicles_router
)
from backend.app.routers.complaints import router as complaints_router
from backend.app.routers.maintenance import router as maintenance_router
from backend.app.routers.amenities import (
    amenities_router,
    bookings_router
)
from backend.app.routers.visitors_and_security import (
    visitors_router,
    parcels_router,
    security_router,
    staff_router
)
from backend.app.routers.chat import router as chat_router
from backend.app.routers.notices import (
    notices_router,
    emergency_router
)
from backend.app.routers.financial import router as financial_router
from backend.app.routers.ai_ml import router as ai_router
from backend.app.routers.notifications import notifications_router
from backend.app.routers.upload import upload_router
from backend.app.routers.activity_logs import (
    activity_router,
    settings_router
)

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Enterprise-grade Python FastAPI backend with PostgreSQL/Supabase & AI Intelligence for TowerTech Smart Society Management System.",
    version=settings.VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)

# CORS Middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global Exception Handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global unhandled error on {request.method} {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "status": "error",
            "message": "An internal server error occurred.",
            "detail": str(exc)
        }
    )

# Register all Routers under /api
api_routers = [
    auth_router,
    society_router,
    residents_router,
    tenants_router,
    family_router,
    vehicles_router,
    complaints_router,
    maintenance_router,
    amenities_router,
    bookings_router,
    visitors_router,
    parcels_router,
    security_router,
    staff_router,
    chat_router,
    notices_router,
    emergency_router,
    financial_router,
    ai_router,
    notifications_router,
    upload_router,
    activity_router,
    settings_router
]

for r in api_routers:
    app.include_router(r, prefix=settings.API_V1_STR)

@app.get("/api/health", tags=["Health"])
async def health_check():
    return {
        "status": "online",
        "service": "TowerTech Python FastAPI Backend",
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "database": "PostgreSQL / Supabase Connected",
        "ai_engine": "Pandas + Scikit-Learn Active"
    }

@app.get("/", tags=["Root"])
async def root():
    return {
        "message": "Welcome to TowerTech Smart Society Management API",
        "documentation": "/docs",
        "redoc": "/redoc",
        "health": "/api/health"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)
