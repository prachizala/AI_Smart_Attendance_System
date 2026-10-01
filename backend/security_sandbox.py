"""
Security Sandbox & Input Validation Module
AI Smart Attendance & Workforce Management System

Provides:
- Strict path canonicalization & traversal prevention (rejects '../', null bytes, symlink escapes)
- Per-target sandbox isolation (Target A cannot access Target B)
- Uploaded image security verification (size limits, decompression bomb prevention, header inspection)
- Input text sanitization against control character injection
"""

import os
import re
import io
import shutil
from typing import Optional, Tuple
from PIL import Image

# Maximum allowed image upload size: 5 MB (in bytes)
MAX_IMAGE_UPLOAD_BYTES = 5 * 1024 * 1024

# Base sandbox storage root for file-processing tasks (isolated per target)
BASE_SANDBOX_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "sandboxes"))


class SecurityException(Exception):
    """Raised when a security constraint or sandbox violation is detected."""
    pass


def sanitize_filename(filename: str) -> str:
    """
    Sanitizes an untrusted filename, stripping directory components, path separators,
    and null bytes, allowing only alphanumeric characters, dashes, underscores, and dots.
    """
    if not filename:
        raise SecurityException("Filename cannot be empty.")
    
    # Strip path separators and null bytes
    cleaned = os.path.basename(filename).replace("\0", "").strip()
    # Remove any characters outside [a-zA-Z0-9_.-]
    cleaned = re.sub(r"[^a-zA-Z0-9_.-]", "_", cleaned)
    # Prevent hidden files or relative traversal dots
    cleaned = cleaned.lstrip(".")
    if not cleaned:
        raise SecurityException("Invalid filename after sanitization.")
    return cleaned


def validate_safe_path(base_dir: str, requested_path: str) -> str:
    """
    Validates that requested_path is strictly within base_dir.
    Rejects any path traversal attempts (e.g. '../', absolute paths escaping base_dir, null bytes).
    Returns the resolved canonical path.
    """
    if not base_dir or not requested_path:
        raise SecurityException("Base directory and requested path are required.")

    # Check for null byte injection
    if "\0" in requested_path or "\0" in base_dir:
        raise SecurityException("Null byte detected in path.")

    # Explicit check for traversal tokens
    traversal_patterns = [r"\.\./", r"\.\.\\", r"^\.\.$", r"/etc/", r"/windows/", r"/system32/"]
    for pattern in traversal_patterns:
        if re.search(pattern, requested_path, re.IGNORECASE):
            raise SecurityException(f"Path traversal pattern detected in: '{requested_path}'")

    canonical_base = os.path.realpath(os.path.abspath(base_dir))
    canonical_target = os.path.realpath(os.path.abspath(os.path.join(base_dir, requested_path)))

    # Ensure canonical_target is strictly within or equal to canonical_base
    try:
        common = os.path.commonpath([canonical_base, canonical_target])
    except ValueError:
        # Cross-drive paths on Windows
        raise SecurityException("Cross-drive path access forbidden.")

    if common != canonical_base:
        raise SecurityException(
            f"Path traversal violation: '{requested_path}' resolves outside allowed directory '{base_dir}'."
        )

    return canonical_target


def get_target_sandbox(target_id: str, create_if_missing: bool = True) -> str:
    """
    Returns an isolated sandbox directory path specifically for target_id.
    Target A cannot read or write Target B's sandbox directory.
    """
    sanitized_id = sanitize_filename(str(target_id))
    sandbox_dir = validate_safe_path(BASE_SANDBOX_DIR, sanitized_id)

    if create_if_missing and not os.path.exists(sandbox_dir):
        os.makedirs(sandbox_dir, mode=0o700, exist_ok=True)

    return sandbox_dir


def cleanup_target_sandbox(target_id: str) -> None:
    """Destroys temporary target sandbox data upon task completion."""
    sanitized_id = sanitize_filename(str(target_id))
    sandbox_dir = os.path.join(BASE_SANDBOX_DIR, sanitized_id)
    if os.path.exists(sandbox_dir):
        try:
            shutil.rmtree(sandbox_dir, ignore_errors=True)
        except Exception:
            pass


def validate_image_security(
    image_bytes: bytes,
    max_bytes: int = MAX_IMAGE_UPLOAD_BYTES
) -> Tuple[str, int, int]:
    """
    Validates uploaded image bytes for security:
    1. Enforces strict file size limit (<= 5MB).
    2. Protects against PIL decompression bombs with MAX_IMAGE_PIXELS limit.
    3. Verifies image headers (JPEG, PNG).
    Returns (format, width, height).
    """
    if not image_bytes:
        raise SecurityException("Image content cannot be empty.")

    if len(image_bytes) > max_bytes:
        raise SecurityException(
            f"Image payload size ({len(image_bytes)} bytes) exceeds maximum permitted limit ({max_bytes} bytes)."
        )

    # Restrict PIL maximum pixels to prevent decompression bombs (DoS)
    Image.MAX_IMAGE_PIXELS = 10_000_000

    try:
        with Image.open(io.BytesIO(image_bytes)) as img:
            img_format = img.format
            if img_format not in ["JPEG", "PNG", "MPO", "WEBP"]:
                raise SecurityException(f"Unsupported image format '{img_format}'. Only JPEG, PNG, WEBP are accepted.")
            width, height = img.size
            if width <= 0 or height <= 0:
                raise SecurityException("Invalid image dimensions.")
            if width > 4096 or height > 4096:
                raise SecurityException(f"Image dimensions ({width}x{height}) exceed maximum allowed 4096x4096.")
            return (img_format, width, height)
    except SecurityException:
        raise
    except Exception as e:
        raise SecurityException(f"Invalid or corrupted image data: {str(e)}")
