def test_signup_success(client):
    response = client.post("/api/v1/auth/signup", json={
        "email": "alice@example.com",
        "password": "StrongPass123",
        "full_name": "Alice Example",
    })
    assert response.status_code == 201
    body = response.json()
    assert body["success"] is True
    assert body["data"]["user"]["email"] == "alice@example.com"
    assert "access_token" in body["data"]


def test_signup_duplicate_email_returns_409(client):
    payload = {"email": "bob@example.com", "password": "StrongPass123", "full_name": "Bob"}
    first = client.post("/api/v1/auth/signup", json=payload)
    assert first.status_code == 201

    second = client.post("/api/v1/auth/signup", json=payload)
    assert second.status_code == 409
    body = second.json()
    assert body["success"] is False
    assert body["error"]["code"] == "EMAIL_ALREADY_REGISTERED"


def test_signup_invalid_email_returns_422(client):
    response = client.post("/api/v1/auth/signup", json={
        "email": "not-an-email",
        "password": "StrongPass123",
        "full_name": "Test",
    })
    assert response.status_code == 422
    assert response.json()["success"] is False


def test_signup_short_password_returns_422(client):
    response = client.post("/api/v1/auth/signup", json={
        "email": "shortpass@example.com",
        "password": "short",
        "full_name": "Test",
    })
    assert response.status_code == 422


def test_login_success(client):
    payload = {"email": "carol@example.com", "password": "StrongPass123", "full_name": "Carol"}
    client.post("/api/v1/auth/signup", json=payload)

    response = client.post("/api/v1/auth/login", json={"email": payload["email"], "password": payload["password"]})
    assert response.status_code == 200
    assert response.json()["data"]["access_token"]


def test_login_wrong_password_returns_401(client):
    payload = {"email": "dave@example.com", "password": "StrongPass123", "full_name": "Dave"}
    client.post("/api/v1/auth/signup", json=payload)

    response = client.post("/api/v1/auth/login", json={"email": payload["email"], "password": "WrongPassword1"})
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "INVALID_CREDENTIALS"


def test_login_nonexistent_user_returns_401(client):
    response = client.post("/api/v1/auth/login", json={"email": "nobody@example.com", "password": "whatever123"})
    assert response.status_code == 401


def test_get_me_requires_auth(client):
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "UNAUTHORIZED"


def test_get_me_with_valid_token(client, auth_headers):
    response = client.get("/api/v1/auth/me", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["data"]["email"] == "testuser@example.com"


def test_get_me_with_invalid_token_returns_401(client):
    response = client.get("/api/v1/auth/me", headers={"Authorization": "Bearer not-a-real-token"})
    assert response.status_code == 401
