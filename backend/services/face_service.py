import io
import re
import json
import base64
from typing import Union, List, Dict, Any, Optional
import numpy as np
import cv2
from PIL import Image, ImageDraw, ImageFont, ImageOps

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
        # If already BGR from cv2, convert to RGB
        if len(image_input.shape) == 3 and image_input.shape[2] == 3:
            return cv2.cvtColor(image_input, cv2.COLOR_BGR2RGB)
        return image_input

    # 1. Handle Base64 Data URLs or raw Base64 strings
    if isinstance(image_input, str):
        # Strip data URL prefix if present: e.g. "data:image/jpeg;base64,..."
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

    # 2. Enforce upload size constraint (max 15MB for high-res mobile selfies)
    if len(image_bytes) > 15 * 1024 * 1024:
        raise ValueError("Image upload size exceeds the maximum allowed limit of 15MB.")

    # 3. Convert raw bytes to PIL Image, protect against decompression bombs, and convert to RGB
    Image.MAX_IMAGE_PIXELS = 100_000_000
    try:
        with Image.open(io.BytesIO(image_bytes)) as pil_img:
            # Auto-orient using EXIF orientation tag if present
            try:
                                pil_img = ImageOps.exif_transpose(pil_img)
            except Exception:
                pass

            # Automatically resize high-resolution mobile photos down to max 1280px
            # This preserves face details, prevents memory exhaustion, and speeds up dlib/OpenCV detection
            if pil_img.width > 1280 or pil_img.height > 1280:
                resample_filter = getattr(getattr(Image, 'Resampling', Image), 'LANCZOS', Image.LANCZOS)
                pil_img.thumbnail((1280, 1280), resample_filter)

            rgb_img = pil_img.convert("RGB")
            rgb_array = np.array(rgb_img)
            return rgb_array
    except ValueError:
        raise
    except Exception as e:
        raise ValueError(f"Failed to decode image buffer into valid RGB array: {str(e)}")


def extract_face_embedding(
    image_input: Union[bytes, str, io.BytesIO, np.ndarray],
    model: str = "hog"
) -> List[float]:
    """
    Action: Convert an uploaded image into a 128-dimensional biometric embedding vector.
    
    1. Reads and decodes image stream from FastAPI or mobile Base64 selfie.
    2. Detects face bounding box with error handling for 'No face' or 'Multiple faces'.
    3. Extracts the 128-d representation vector and returns it as a list of floats.
    """
    rgb_image = decode_image_to_rgb(image_input)

    if FACE_RECOGNITION_AVAILABLE and face_recognition is not None:
        # Detect face locations using HOG (fast CPU) or CNN
        locations = face_recognition.face_locations(rgb_image, model=model)

        if len(locations) == 0:
            raise ValueError("No face detected in the image. Please ensure your face is well-lit and facing the camera directly.")
        
        if len(locations) > 1:
            raise ValueError(f"Multiple faces detected ({len(locations)}). Only one employee face must be present in the frame.")

        # Extract 128-d embedding
        encodings = face_recognition.face_encodings(rgb_image, known_face_locations=locations)
        if len(encodings) == 0:
            raise ValueError("Could not extract facial feature embedding. Please try capturing another angle.")

        # Return as serializable Python list of floats
        return encodings[0].tolist()

    else:
        # Fallback: OpenCV Haar Cascade detection + normalized representation
        gray = cv2.cvtColor(rgb_image, cv2.COLOR_RGB2GRAY)
        face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
        faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(60, 60))

        if len(faces) == 0:
            raise ValueError("No face detected in the image via OpenCV. Please ensure proper lighting.")
        if len(faces) > 1:
            raise ValueError("Multiple faces detected in frame. Only 1 face allowed.")

        x, y, w, h = faces[0]
        face_roi = gray[y:y+h, x:x+w]
        resized = cv2.resize(face_roi, (16, 8)).flatten()  # 16*8 = 128 features
        normalized = resized.astype(np.float64) / (np.linalg.norm(resized) + 1e-7)
        return normalized.tolist()


def verify_face(
    live_encoding: Union[List[float], np.ndarray, str],
    db_encoding: Union[List[float], np.ndarray, str],
    tolerance: float = 0.5
) -> Dict[str, Any]:
    """
    Action: Compare a real-time selfie representation against the registered DB embedding.
    
    1. Converts stored DB string/list back to NumPy array.
    2. Calculates Euclidean distance: || live - db ||.
    3. Evaluates distance <= tolerance.
    """
    # Parse live_encoding if passed as JSON string
    if isinstance(live_encoding, str):
        live_array = np.array(json.loads(live_encoding), dtype=np.float64)
    else:
        live_array = np.array(live_encoding, dtype=np.float64)

    # Parse db_encoding if passed as JSON string from SQLite
    if isinstance(db_encoding, str):
        db_array = np.array(json.loads(db_encoding), dtype=np.float64)
    else:
        db_array = np.array(db_encoding, dtype=np.float64)

    if live_array.shape != db_array.shape:
        raise ValueError(
            f"Embedding dimension mismatch: live vector {live_array.shape} vs DB vector {db_array.shape}."
        )

    # Calculate Euclidean distance: np.linalg.norm(live - db)
    distance = float(np.linalg.norm(live_array - db_array))
    is_matched = bool(distance <= tolerance)

    # Calculate intuitive confidence score (0% to 100%)
    # Standard threshold 0.5: distance=0 -> 100%, distance=0.5 -> 50%, distance >= 1.0 -> 0%
    confidence = max(0.0, min(1.0, 1.0 - (distance / (tolerance * 2)))) * 100.0

    return {
        "is_matched": is_matched,
        "distance": round(distance, 4),
        "tolerance": tolerance,
        "confidence_percentage": round(confidence, 2)
    }


def serialize_embedding(embedding: List[float]) -> str:
    """Helper to convert list of floats to JSON string for SQLite storage."""
    return json.dumps(embedding)


def deserialize_embedding(db_string: str) -> np.ndarray:
    """Helper to convert stored DB string back to a NumPy array."""
    return np.array(json.loads(db_string), dtype=np.float64)


def add_attendance_watermark(
    image_input: Union[bytes, str, io.BytesIO, np.ndarray],
    employee_id: str,
    latitude: float,
    longitude: float,
    timestamp_str: Optional[str] = None,
    location_name: str = "SBS Campus"
) -> str:
    """
    Burns an official Proof of Presence audit watermark onto the verified attendance selfie:
    - Banner at bottom with Employee ID, Time, GPS Coordinates, and Verification Badge.
    - Returns Base64 JPEG data URL.
    """
    import datetime
    if not timestamp_str:
        timestamp_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    rgb_array = decode_image_to_rgb(image_input)
    pil_img = Image.fromarray(rgb_array)

    w, h = pil_img.size
    overlay = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    # Watermark banner height: 14% of height, min 55px
    bar_height = max(55, int(h * 0.14))
    bar_top = h - bar_height

    # Slate 900 semi-transparent background
    draw.rectangle([(0, bar_top), (w, h)], fill=(15, 23, 42, 225))
    # Emerald-500 indicator stripe on top
    draw.rectangle([(0, bar_top), (w, bar_top + 3)], fill=(16, 185, 129, 255))

    line1 = f"PROOF OF PRESENCE | ID: {employee_id} | {location_name}"
    line2 = f"{timestamp_str} | GPS: {latitude:.5f}, {longitude:.5f} | VERIFIED ✓"

    # Draw text cleanly with high contrast
    draw.text((12, bar_top + 7), line1, fill=(241, 245, 249, 255))
    draw.text((12, bar_top + 28), line2, fill=(148, 163, 184, 255))

    final_img = Image.alpha_composite(pil_img.convert("RGBA"), overlay).convert("RGB")
    out_buf = io.BytesIO()
    final_img.save(out_buf, format="JPEG", quality=85)
    return base64.b64encode(out_buf.getvalue()).decode("utf-8")

def analyze_face_quality(image_input: Union[bytes, str, io.BytesIO, np.ndarray]) -> Dict[str, Any]:
    """
    Computes computer vision biometric quality metrics for enrollment photos:
    1. Average Luminance / Lighting balance
    2. Focus / Blur variance via Laplacian operator
    3. Facial detection bounding box proportions
    4. Overall enrollment quality score (0-100%) and Grade
    """
    rgb = decode_image_to_rgb(image_input)
    gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
    h, w = gray.shape

    # 1. Lighting analysis (0-255 luminance)
    brightness = float(np.mean(gray))
    if brightness < 40:
        lighting_status = "Poor (Too Dark)"
        lighting_score = 30
    elif brightness > 225:
        lighting_status = "Poor (Overexposed)"
        lighting_score = 40
    elif 60 <= brightness <= 190:
        lighting_status = "Optimal Lighting ✓"
        lighting_score = 100
    else:
        lighting_status = "Acceptable Lighting"
        lighting_score = 75

    # 2. Sharpness / Blur analysis (Laplacian variance)
    blur_var = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    if blur_var < 50:
        sharpness_status = "Very Blurry ⚠️"
        sharpness_score = 25
    elif blur_var < 100:
        sharpness_status = "Mildly Soft"
        sharpness_score = 65
    else:
        sharpness_status = "Crisp & Sharp ✓"
        sharpness_score = 100

    # 3. Face Detection & Framing check
    face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
    faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=4, minSize=(60, 60))

    face_count = len(faces)
    face_detected = face_count > 0
    if face_count == 1:
        fx, fy, fw, fh = faces[0]
        face_area_ratio = (fw * fh) / (w * h)
        if 0.08 <= face_area_ratio <= 0.85:
            framing_status = "Well Centered ✓"
            framing_score = 100
        else:
            framing_status = "Face Too Small or Too Close"
            framing_score = 60
    elif face_count > 1:
        framing_status = "Multiple Faces Detected"
        framing_score = 40
    else:
        framing_status = "No Face Detected"
        framing_score = 0

    # 4. Total Quality Score (Weighted calculation)
    if not face_detected:
        quality_score = 15
        grade = "Rejected (No Face)"
        is_acceptable = False
    else:
        quality_score = int((lighting_score * 0.35) + (sharpness_score * 0.35) + (framing_score * 0.30))
        is_acceptable = quality_score >= 60
        if quality_score >= 85:
            grade = "Grade A (Optimal Enrollment)"
        elif quality_score >= 70:
            grade = "Grade B (Good Quality)"
        elif quality_score >= 60:
            grade = "Grade C (Acceptable)"
        else:
            grade = "Sub-optimal (Retake Recommended)"

    return {
        "quality_score": quality_score,
        "grade": grade,
        "is_acceptable": is_acceptable,
        "face_detected": face_detected,
        "face_count": face_count,
        "lighting": {
            "brightness_value": round(brightness, 1),
            "status": lighting_status,
            "score": lighting_score
        },
        "sharpness": {
            "blur_variance": round(blur_var, 1),
            "status": sharpness_status,
            "score": sharpness_score
        },
        "framing": {
            "status": framing_status,
            "score": framing_score
        }
    }

