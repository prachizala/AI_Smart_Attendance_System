import models
from auth import create_token
from database import SessionLocal

_cached_token = None


def get_admin_headers():
    global _cached_token
    if _cached_token:
        return {"Authorization": f"Bearer {_cached_token}"}

    db = SessionLocal()
    try:
        admin = db.query(models.User).filter(models.User.role == "admin").first()
        admin_id = admin.id if admin else 1
    finally:
        db.close()

    _cached_token = create_token({"sub": str(admin_id), "role": "admin"})
    return {"Authorization": f"Bearer {_cached_token}"}
