import os

import pytest
from auth import get_password_hash

os.environ["DATABASE_URL"] = "sqlite:///./test_runner.db"

import database
import models


@pytest.fixture(scope="session", autouse=True)
def setup_test_database():
    models.Base.metadata.drop_all(bind=database.engine)
    models.Base.metadata.create_all(bind=database.engine)

    # Seed baseline admin for test suites that require pre-existing admin
    db = database.SessionLocal()
    try:
        admin = models.User(
            employee_id="ADMIN01",
            full_name="Admin Test User",
            email="admin01@college.edu",
            hashed_password=get_password_hash("AdminPass123"),
            role="admin",
            is_active=True
        )
        db.add(admin)
        db.commit()
    finally:
        db.close()

    yield

    models.Base.metadata.drop_all(bind=database.engine)
    if os.path.exists("./test_runner.db"):
        try:
            os.remove("./test_runner.db")
        except Exception:
            pass
