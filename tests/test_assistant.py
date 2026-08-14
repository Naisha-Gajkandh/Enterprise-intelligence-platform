from datetime import date, timedelta

from app import models
from tests.conftest import TestingSessionLocal


def test_chat_requires_auth(client):
    response = client.post("/api/v1/assistant/chat", json={"message": "hello"})
    assert response.status_code == 401


def test_chat_empty_message_returns_422(client, auth_headers):
    response = client.post("/api/v1/assistant/chat", json={"message": ""}, headers=auth_headers)
    assert response.status_code == 422


def test_chat_product_recommendation_intent(client, auth_headers):
    db = TestingSessionLocal()
    db.add(models.Product(name="Rain Jacket", category="Outerwear", price=79.0, description="Waterproof jacket"))
    db.commit()
    db.close()

    response = client.post(
        "/api/v1/assistant/chat",
        json={"message": "recommend me a waterproof jacket"},
        headers=auth_headers,
    )
    assert response.status_code == 200
    body = response.json()["data"]
    assert body["intent"] == "product_recommendation"
    assert "reply" in body


def test_chat_structured_query_intent(client, auth_headers):
    db = TestingSessionLocal()
    product = models.Product(name="Widget", category="Gadgets", price=10.0, description="A widget")
    db.add(product)
    db.commit()
    db.refresh(product)
    db.add(models.Transaction(
        order_date=date.today() - timedelta(days=1),
        product_id=product.id, category="Gadgets", quantity=1, revenue=10.0,
    ))
    db.commit()
    db.close()

    response = client.post(
        "/api/v1/assistant/chat",
        json={"message": "what is our total revenue?"},
        headers=auth_headers,
    )
    assert response.status_code == 200
    body = response.json()["data"]
    assert body["intent"] == "structured_query"
    assert "revenue" in body["reply"].lower()
