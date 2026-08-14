import os

os.environ["SECRET_KEY"] = "test-secret-key-for-ci-only"
os.environ["DATABASE_URL"] = "sqlite:///./test.db"
os.environ["GROQ_API_KEY"] = ""  # force templated (non-LLM) responses during tests

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.database import Base, get_db

TEST_DB_URL = "sqlite:///./test.db"
engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(autouse=True)
def setup_database():
    """Fresh schema before every single test — prevents state (like seeded
    transactions) from one test leaking into another regardless of order."""
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def client():
    return TestClient(app)


@pytest.fixture()
def auth_headers(client):
    """Signs up a fresh user and returns Authorization headers for it."""
    signup_payload = {
        "email": "testuser@example.com",
        "password": "SecurePass123",
        "full_name": "Test User",
    }
    response = client.post("/api/v1/auth/signup", json=signup_payload)
    if response.status_code == 409:
        # Already exists from a prior test in this session -> log in instead.
        response = client.post(
            "/api/v1/auth/login",
            json={"email": signup_payload["email"], "password": signup_payload["password"]},
        )
    token = response.json()["data"]["access_token"]
    return {"Authorization": f"Bearer {token}"}
