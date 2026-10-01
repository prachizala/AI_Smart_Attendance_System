import pytest
import numpy as np
import json
from services.face_service import verify_face, serialize_embedding, deserialize_embedding, extract_face_embedding


def test_verify_face_identical():
    # 128-dimensional mock vector
    base_vector = [0.1] * 128
    result = verify_face(base_vector, base_vector, tolerance=0.5)
    assert result["is_matched"] is True
    assert result["distance"] == 0.0
    assert result["confidence_percentage"] == 100.0


def test_verify_face_within_tolerance():
    vec_a = [0.1] * 128
    vec_b = [0.12] * 128  # small perturbation: sqrt(128 * 0.02^2) = sqrt(128 * 0.0004) = 0.226 < 0.5
    result = verify_face(vec_a, vec_b, tolerance=0.5)
    assert result["is_matched"] is True
    assert result["distance"] < 0.5
    assert result["confidence_percentage"] > 50.0


def test_verify_face_outside_tolerance():
    vec_a = [0.1] * 128
    vec_b = [0.5] * 128  # large perturbation: sqrt(128 * 0.4^2) = sqrt(20.48) = 4.52 > 0.5
    result = verify_face(vec_a, vec_b, tolerance=0.5)
    assert result["is_matched"] is False
    assert result["distance"] > 0.5
    assert result["confidence_percentage"] == 0.0


def test_verify_face_with_serialized_string():
    vec_a = [0.05] * 128
    serialized_b = json.dumps(vec_a)
    result = verify_face(vec_a, serialized_b, tolerance=0.5)
    assert result["is_matched"] is True
    assert result["distance"] == 0.0


def test_no_face_detected_error_handling():
    # Blank black image (100x100 RGB)
    blank_image = np.zeros((100, 100, 3), dtype=np.uint8)
    with pytest.raises(ValueError, match="No face detected"):
        extract_face_embedding(blank_image)


if __name__ == "__main__":
    pytest.main(["-v", "backend/tests/test_face_service.py"])
