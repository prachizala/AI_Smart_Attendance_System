import math
import os
from typing import Dict, Any, Optional
from dotenv import load_dotenv

# Load environment configuration from .env if present
load_dotenv()

# SBS Shanti Business School, Shela, Ahmedabad, Gujarat 380058
OFFICE_LAT = float(os.getenv("OFFICE_LATITUDE", "23.002217"))
OFFICE_LON = float(os.getenv("OFFICE_LONGITUDE", "72.455763"))
ALLOWED_RADIUS_METERS = float(os.getenv("ALLOWED_RADIUS_METERS", "100.0"))

EARTH_RADIUS_METERS = 6371000.0


def calculate_haversine_distance(
    lat1: float,
    lon1: float,
    lat2: float,
    lon2: float
) -> float:
    """Calculates great-circle distance between two GPS coordinates using Haversine."""
    if not (-90.0 <= lat1 <= 90.0) or not (-90.0 <= lat2 <= 90.0):
        raise ValueError("Latitude must be between -90.0 and 90.0 degrees.")
    if not (-180.0 <= lon1 <= 180.0) or not (-180.0 <= lon2 <= 180.0):
        raise ValueError("Longitude must be between -180.0 and 180.0 degrees.")

    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (
        math.sin(delta_phi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * (math.sin(delta_lambda / 2.0) ** 2)
    )
    a = min(1.0, max(0.0, a))

    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    distance_meters = EARTH_RADIUS_METERS * c

    return round(distance_meters, 2)


def verify_location(
    emp_lat: float,
    emp_lon: float,
    office_lat: float = OFFICE_LAT,
    office_lon: float = OFFICE_LON,
    allowed_radius: float = ALLOWED_RADIUS_METERS
) -> Dict[str, Any]:
    """Validates whether employee is within office perimeter, returning inside_geofence and distance_meters."""
    distance = calculate_haversine_distance(emp_lat, emp_lon, office_lat, office_lon)
    inside_geofence = bool(distance <= allowed_radius)

    return {
        "inside_geofence": inside_geofence,
        "distance_meters": distance,
        "allowed_radius_meters": allowed_radius,
        "office_latitude": office_lat,
        "office_longitude": office_lon,
        "device_latitude": emp_lat,
        "device_longitude": emp_lon,
        "is_within_geofence": inside_geofence,
        "status": "APPROVED" if inside_geofence else "REJECTED_OUTSIDE_GEOFENCE"
    }


def is_within_geofence(
    device_lat: float,
    device_lon: float,
    office_lat: Optional[float] = None,
    office_lon: Optional[float] = None,
    allowed_radius: Optional[float] = None
) -> Dict[str, Any]:
    return verify_location(
        emp_lat=device_lat,
        emp_lon=device_lon,
        office_lat=office_lat if office_lat is not None else OFFICE_LAT,
        office_lon=office_lon if office_lon is not None else OFFICE_LON,
        allowed_radius=allowed_radius if allowed_radius is not None else ALLOWED_RADIUS_METERS
    )
