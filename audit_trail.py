"""
Cryptographically Signed Attendance Audit Trail
Generates HMAC-SHA256 signatures over student check-in event logs for tamper-evident compliance.
"""
import hmac
import hashlib
from typing import Dict, Any

class AttendanceAuditLogger:
    def __init__(self, secret_key: str = "smart-attendance-salt"):
        self.secret_key = secret_key.encode("utf-8")

    def generate_record_signature(self, record: Dict[str, Any]) -> str:
        serialized = f"{record.get('student_id')}:{record.get('timestamp')}:{record.get('status')}"
        return hmac.new(self.secret_key, serialized.encode("utf-8"), hashlib.sha256).hexdigest()

    def verify_record(self, record: Dict[str, Any], signature: str) -> bool:
        expected = self.generate_record_signature(record)
        return hmac.compare_digest(expected, signature)

if __name__ == "__main__":
    logger = AttendanceAuditLogger("test-secret-key")
    rec = {"student_id": "STU101", "timestamp": "2026-11-21T10:00:00Z", "status": "PRESENT"}
    sig = logger.generate_record_signature(rec)
    assert logger.verify_record(rec, sig) is True
    print("Attendance audit logger unit tests passed!")
