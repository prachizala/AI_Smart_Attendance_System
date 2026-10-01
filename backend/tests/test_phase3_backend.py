import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database import Base, engine

client = TestClient(app)


def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ONLINE"
    assert "geofence" in data


def test_user_registration_and_auth_flow():
    # Register an admin user
    admin_payload = {
        "employee_id": "ADM001",
        "full_name": "System Administrator",
        "email": "admin@college.edu",
        "password": "AdminPassword123",
        "role": "admin",
        "base_salary": 60000.0
    }
    reg_res = client.post("/api/auth/register", json=admin_payload)
    assert reg_res.status_code in [201, 400]  # 400 if already registered from previous run

    # Login with employee_id
    login_payload = {
        "identifier": "ADM001",
        "password": "AdminPassword123"
    }
    login_res = client.post("/api/auth/login", json=login_payload)
    assert login_res.status_code == 200
    token_data = login_res.json()
    assert "access_token" in token_data
    token = token_data["access_token"]

    # Access protected /me route
    headers = {"Authorization": f"Bearer {token}"}
    me_res = client.get("/api/auth/me", headers=headers)
    assert me_res.status_code == 200
    me_data = me_res.json()
    assert me_data["employee_id"] == "ADM001"
    assert me_data["role"] == "admin"

    # Register standard employee
    emp_payload = {
        "employee_id": "EMP101",
        "full_name": "Prachi Sharma",
        "email": "prachi@college.edu",
        "password": "StudentPassword123",
        "role": "employee",
        "base_salary": 40000.0
    }
    emp_reg_res = client.post("/api/auth/register", json=emp_payload)
    assert emp_reg_res.status_code in [201, 400]

    # Admin lists users
    users_res = client.get("/api/auth/users", headers=headers)
    assert users_res.status_code == 200
    users_list = users_res.json()
    assert len(users_list) >= 2


if __name__ == "__main__":
    pytest.main(["-v", "backend/tests/test_phase3_backend.py"])
