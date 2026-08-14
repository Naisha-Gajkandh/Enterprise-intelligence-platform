from datetime import date, timedelta

import pytest

from app import models
from tests.conftest import TestingSessionLocal


def test_kpis_requires_auth(client):
    response = client.get("/api/v1/analytics/kpis")
    assert response.status_code == 401


def test_kpis_with_no_data_returns_zeros(client, auth_headers):
    response = client.get("/api/v1/analytics/kpis", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["total_revenue"] == 0.0
    assert data["total_transactions"] == 0


@pytest.fixture()
def seeded_transactions():
    db = TestingSessionLocal()
    product = models.Product(name="Test Product", category="TestCategory", price=50.0, description="desc")
    db.add(product)
    db.commit()
    db.refresh(product)

    today = date.today()
    for i in range(20):
        db.add(models.Transaction(
            order_date=today - timedelta(days=20 - i),
            product_id=product.id,
            category="TestCategory",
            quantity=2,
            revenue=100.0 + i,
        ))
    db.commit()
    db.close()
    return product


def test_kpis_with_data(client, auth_headers, seeded_transactions):
    response = client.get("/api/v1/analytics/kpis", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["total_transactions"] == 20
    assert data["total_revenue"] > 0


def test_revenue_daily(client, auth_headers, seeded_transactions):
    response = client.get("/api/v1/analytics/revenue-daily", headers=auth_headers)
    assert response.status_code == 200
    assert len(response.json()["data"]) > 0


def test_categories(client, auth_headers, seeded_transactions):
    response = client.get("/api/v1/analytics/categories", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()["data"]
    assert data[0]["category"] == "TestCategory"


def test_forecast_with_insufficient_data_returns_empty_list(client, auth_headers):
    response = client.get("/api/v1/analytics/forecast", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["data"] == []


def test_forecast_with_enough_data(client, auth_headers, seeded_transactions):
    response = client.get("/api/v1/analytics/forecast?days=5", headers=auth_headers)
    assert response.status_code == 200
    assert len(response.json()["data"]) == 5


def test_forecast_invalid_days_param_returns_422(client, auth_headers):
    response = client.get("/api/v1/analytics/forecast?days=100", headers=auth_headers)  # max is 30
    assert response.status_code == 422
