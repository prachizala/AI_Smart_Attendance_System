from fastapi.testclient import TestClient
from main import app

def get_admin_headers():
    client = TestClient(app)
    res = client.post("/api/auth/login", json={"identifier": "ADMIN01", "password": "admin123"})
    if res.status_code == 200:
        token = res.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    return {}
