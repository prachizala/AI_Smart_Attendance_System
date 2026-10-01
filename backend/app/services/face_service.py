import io
import re
import json
import base64
from typing import Union, List, Dict, Any, Optional
import numpy as np
import cv2
from PIL import Image

try:
    import face_recognition
    FACE_RECOGNITION_AVAILABLE = True
except ImportError:
    face_recognition = None
    FACE_RECOGNITION_AVAILABLE = False


def decode_image_to_rgb(image_input: Union[bytes, str, io.BytesIO, np.ndarray]) -> np.ndarray:
    """
    Decodes an image from multiple formats (Base64 string, raw bytes, BytesIO, or NumPy)
    into a standardized RGB NumPy array suitable for facial processing.
    """
    if isinstance(image_input, np.ndarray):
        if len(image_input.shape) == 3 and image_input.shape[2] == 3:
            return cv2.cvtColor(image_input, cv2.COLOR_BGR2RGB)
        return image_input

    if isinstance(image_input, str):
        clean_base64 = re.sub(r"^data:image\/[a-zA-Z]+;base64,", "", image_input.strip())
        try:
            image_bytes = base64.b64decode(clean_base64)
        except Exception as e:
            raise ValueError(f"Invalid Base64 image encoding: {str(e)}")
    elif isinstance(image_input, io.BytesIO):
        image_bytes = image_input.getvalue()
    elif isinstance(image_input, bytes):
        image_bytes = image_input
    else:
        raise TypeError("Unsupported image input type. Expected Base64 string, bytes, or NumPy array.")

    try:
        pil_img = Image.open(io.BytesIO(image_bytes))
        pil_img = pil_img.convert("RGB")
        rgb_array = np.array(pil_img)
        return rgb_array
    except Exception as e:
        raise ValueError(f"Failed to decode image buffer into valid RGB array: {str(e)}")


def extract_face_embedding(
    image_input: Union[bytes, str, io.BytesIO, np.ndarray],
    model: str = "hog"
) -> List[float]:
    """
    Action: Convert an uploaded image into a 128-dimensional biometric embedding vector.
    """
    rgb_image = decode_image_to_rgb(image_input)

    if FACE_RECOGNITION_AVAILABLE and face_recognition is not None:
        locations = face_recognition.face_locations(rgb_image, model=model)

        if len(locations) == 0:
            raise ValueError("No face detected in the image. Please ensure your face is well-lit and facing the camera directly.")
        
        if len(locations) > 1:
            raise ValueError(f"Multiple faces detected ({len(locations)}). Only one employee face must be present in the frame.")

        encodings = face_recognition.face_encodings(rgb_image, known_face_locations=locations)
        if len(encodings) == 0:
            raise ValueError("Could not extract facial feature embedding. Please try capturing another angle.")

        return encodings[0].tolist()

    else:
        gray = cv2.cvtColor(rgb_image, cv2.COLOR_RGB2GRAY)
        face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
        faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(60, 60))

        if len(faces) == 0:
            raise ValueError("No face detected in the image via OpenCV. Please ensure proper lighting.")
        if len(faces) > 1:
            raise ValueError("Multiple faces detected in frame. Only 1 face allowed.")

        x, y, w, h = faces[0]
        face_roi = gray[y:y+h, x:x+w]
        resized = cv2.resize(face_roi, (16, 8)).flatten()
        normalized = resized.astype(np.float64) / (np.linalg.norm(resized) + 1e-7)
        return normalized.tolist()


def verify_face(
    live_encoding: Union[List[float], np.ndarray, str],
    db_encoding: Union[List[float], np.ndarray, str],
    tolerance: float = 0.5
) -> Dict[str, Any]:
    """
    Action: Compare a real-time selfie representation against the registered DB embedding.
    Calculates Euclidean distance: || live - db || <= tolerance.
    """
    if isinstance(live_encoding, str):
        live_array = np.array(json.loads(live_encoding), dtype=np.float64)
    else:
        live_array = np.array(live_encoding, dtype=np.float64)

    if isinstance(db_encoding, str):
        db_array = np.array(json.loads(db_encoding), dtype=np.float64)
    else:
        db_array = np.array(db_encoding, dtype=np.float64)

    if live_array.shape != db_array.shape:
        raise ValueError(
            f"Embedding dimension mismatch: live vector {live_array.shape} vs DB vector {db_array.shape}."
        )

    distance = float(np.linalg.norm(live_array - db_array))
    is_matched = bool(distance <= tolerance)
    confidence = max(0.0, min(1.0, 1.0 - (distance / (tolerance * 2)))) * 100.0

    return {
        "is_matched": is_matched,
        "distance": round(distance, 4),
        "tolerance": tolerance,
        "confidence_percentage": round(confidence, 2)
    }


def serialize_embedding(embedding: List[float]) -> str:
    return json.dumps(embedding)


def deserialize_embedding(db_string: str) -> np.ndarray:
    return np.array(json.loads(db_string), dtype=np.float64)
