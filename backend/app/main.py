from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import engine, Base
import app.models  # Ensures all models are registered before create_all
from app.api.auth import router as auth_router

# Initialize all database tables in SQLite
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Dual-factor AI Biometric (Face Verification) & GPS Geofencing Attendance System",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Configure CORS for Mobile App (React Native) & Admin Web (React.js)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins for local network mobile testing
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers
app.include_router(auth_router)


@app.get("/", tags=["System Health"])
def root():
    return {
        "status": "ONLINE",
        "project": settings.PROJECT_NAME,
        "version": "1.0.0",
        "geofence": {
            "latitude": settings.OFFICE_LATITUDE,
            "longitude": settings.OFFICE_LONGITUDE,
            "allowed_radius_meters": settings.ALLOWED_RADIUS_METERS
        },
        "docs": "/docs"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
