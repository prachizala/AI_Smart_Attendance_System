import os
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "AI Smart Attendance System"
    SECRET_KEY: str = "college-secret-key-change-in-production-demo"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours

    # Database: SQLite for local academic MVP
    DATABASE_URL: str = "sqlite:///./smart_attendance.db"

    # Default Office Geofence Coordinates (SBS Shanti Business School, Shela, Ahmedabad, Gujarat 380058)
    OFFICE_LATITUDE: float = 23.002217
    OFFICE_LONGITUDE: float = 72.455763
    ALLOWED_RADIUS_METERS: float = 100.0  # Buffer for indoor GPS drift

    # Office Timings
    OFFICE_START_TIME: str = "09:30"
    OFFICE_END_TIME: str = "18:00"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="allow"
    )


settings = Settings()
