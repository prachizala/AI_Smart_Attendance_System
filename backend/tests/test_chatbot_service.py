import pytest
from datetime import date
from main import app, engine
from database import SessionLocal
import models
from services.chatbot_service import process_chat_query, calculate_punctuality_score


def test_chatbot_service_basic():
    db = SessionLocal()
    try:
        user = db.query(models.User).first()
        if not user:
            user = models.User(
                employee_id="TEST01",
                full_name="Test User",
                email="test@example.com",
                password_hash="mock",
                role="employee"
            )
            db.add(user)
            db.commit()
            db.refresh(user)

        # Test Today's status query
        res_today = process_chat_query(db, user, "What is my attendance today?", "en")
        assert "reply" in res_today
        assert "chips" in res_today

        # Test Hindi query
        res_hi = process_chat_query(db, user, "Meri attendance dikhao", "hi")
        assert len(res_hi["reply"]) > 0

        # Test Trust score
        score_res = calculate_punctuality_score(db, user.id)
        assert 300 <= score_res["score"] <= 900
    finally:
        db.close()


if __name__ == "__main__":
    test_chatbot_service_basic()
    print("Chatbot unit tests passed!")
