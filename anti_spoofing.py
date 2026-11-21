"""
Facial Liveness & Anti-Spoofing Blink Rate Analyzer
Computes Eye Aspect Ratio (EAR) to detect dynamic blinking and prevent static photo spoofing.
"""
from typing import List, Tuple
import math

class FacialLivenessDetector:
    def __init__(self, ear_threshold: float = 0.22, min_consecutive_frames: int = 3):
        self.ear_threshold = ear_threshold
        self.min_consecutive_frames = min_consecutive_frames

    def compute_ear(self, eye_landmarks: List[Tuple[float, float]]) -> float:
        if len(eye_landmarks) < 6:
            return 0.0
        # Euclidean distances of vertical landmarks
        v1 = math.dist(eye_landmarks[1], eye_landmarks[5])
        v2 = math.dist(eye_landmarks[2], eye_landmarks[4])
        # Euclidean distance of horizontal landmark
        h = math.dist(eye_landmarks[0], eye_landmarks[3])
        if h == 0:
            return 0.0
        return round((v1 + v2) / (2.0 * h), 4)

    def is_blink(self, ear_value: float) -> bool:
        return ear_value < self.ear_threshold

if __name__ == "__main__":
    detector = FacialLivenessDetector()
    open_eye = [(0, 10), (5, 15), (10, 15), (15, 10), (10, 5), (5, 5)]
    ear = detector.compute_ear(open_eye)
    assert ear > 0.22
    assert not detector.is_blink(ear)
    print("Facial liveness analyzer unit tests passed!")
