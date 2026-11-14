"""Haversine Geofencing Module for AI Smart Attendance System.

Computes geodesic distances between employee GPS coordinates and authorized
office boundaries to prevent remote punch-in spoofing.
"""

import math
from typing import Tuple, Dict, Any

# Default Office Coordinates: Ahmedabad tech hub / university campus
DEFAULT_OFFICE_LAT = 23.022500
DEFAULT_OFFICE_LON = 72.571400
DEFAULT_GEOFENCE_RADIUS_METERS = 100.0


def haversine_distance(
    lat1: float,
    lon1: float,
    lat2: float,
    lon2: float
) -> float:
    """Calculates the great-circle distance between two points on the Earth.

    Uses the spherical Haversine formula:
        a = sin²(Δφ/2) + cos φ1 ⋅ cos φ2 ⋅ sin²(Δλ/2)
        c = 2 ⋅ atan2( √a, √(1−a) )
        d = R ⋅ c

    Args:
        lat1, lon1: Coordinates of point 1 in decimal degrees.
        lat2, lon2: Coordinates of point 2 in decimal degrees.

    Returns:
        Distance in meters.
    """
    R = 6371000.0  # Earth's radius in meters

    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (math.sin(delta_phi / 2.0) ** 2 +
         math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2)
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))

    distance = R * c
    return distance


def validate_geofence(
    user_lat: float,
    user_lon: float,
    office_lat: float = DEFAULT_OFFICE_LAT,
    office_lon: float = DEFAULT_OFFICE_LON,
    radius_meters: float = DEFAULT_GEOFENCE_RADIUS_METERS
) -> Dict[str, Any]:
    """Validates whether a user's location falls within the geofenced perimeter.

    Returns:
        dict containing 'within_geofence' (bool), 'distance_meters' (float),
        and 'radius_meters' (float).
    """
    dist = haversine_distance(user_lat, user_lon, office_lat, office_lon)
    is_valid = dist <= radius_meters

    return {
        "within_geofence": is_valid,
        "distance_meters": round(dist, 2),
        "radius_meters": radius_meters,
        "office_coords": (office_lat, office_lon),
        "user_coords": (user_lat, user_lon)
    }
