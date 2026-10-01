import pytest
from services.geo_service import calculate_haversine_distance, verify_location, is_within_geofence

OFFICE_LAT = 23.002217
OFFICE_LON = 72.455763
TARGET_RADIUS = 100.0  # meters


def test_verify_location_exact_coordinates():
    # Exactly on office coordinates
    result = verify_location(OFFICE_LAT, OFFICE_LON, OFFICE_LAT, OFFICE_LON, TARGET_RADIUS)
    assert result["inside_geofence"] is True
    assert result["distance_meters"] == 0.0
    assert "inside_geofence" in result
    assert "distance_meters" in result


def test_verify_location_inside_perimeter():
    # Offset by ~0.0002 degrees latitude (~22.2 meters away)
    near_lat = OFFICE_LAT + 0.0002
    near_lon = OFFICE_LON
    result = verify_location(near_lat, near_lon, OFFICE_LAT, OFFICE_LON, TARGET_RADIUS)
    assert result["inside_geofence"] is True
    assert 15.0 <= result["distance_meters"] <= 30.0


def test_verify_location_outside_perimeter():
    # Offset by ~0.0015 degrees latitude (~166 meters away)
    outside_lat = OFFICE_LAT + 0.0015
    outside_lon = OFFICE_LON
    result = verify_location(outside_lat, outside_lon, OFFICE_LAT, OFFICE_LON, TARGET_RADIUS)
    assert result["inside_geofence"] is False
    assert result["distance_meters"] > 100.0


def test_verify_location_far_away():
    # Home coordinate 5km away
    home_lat = 23.1200
    home_lon = 72.6900
    result = verify_location(home_lat, home_lon, OFFICE_LAT, OFFICE_LON, TARGET_RADIUS)
    assert result["inside_geofence"] is False
    assert result["distance_meters"] > 4000.0


def test_invalid_coordinates():
    with pytest.raises(ValueError, match="Latitude must be between"):
        calculate_haversine_distance(95.0, 72.0, OFFICE_LAT, OFFICE_LON)

    with pytest.raises(ValueError, match="Longitude must be between"):
        calculate_haversine_distance(19.0, 195.0, OFFICE_LAT, OFFICE_LON)


if __name__ == "__main__":
    pytest.main(["-v", "backend/tests/test_geo_service.py"])
