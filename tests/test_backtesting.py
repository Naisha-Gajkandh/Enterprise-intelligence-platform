def test_run_backtest_requires_auth(client):
    response = client.post("/api/v1/backtest/run", json={})
    assert response.status_code == 401


def test_run_backtest_success(client, auth_headers):
    response = client.post(
        "/api/v1/backtest/run",
        json={
            "strategy": "sma_crossover",
            "fast_window": 10,
            "slow_window": 50,
            "fee_pct": 0.1,
            "initial_capital": 10000,
            "days": 200,
        },
        headers=auth_headers,
    )
    assert response.status_code == 201
    body = response.json()
    assert body["success"] is True
    summary = body["data"]["summary"]
    assert "sharpe_ratio" in summary
    assert "max_drawdown_pct" in summary
    assert "cagr_pct" in summary
    assert "win_rate_pct" in summary
    assert len(body["data"]["equity_curve"]) == 200


def test_run_backtest_invalid_windows_returns_400(client, auth_headers):
    response = client.post(
        "/api/v1/backtest/run",
        json={
            "strategy": "sma_crossover",
            "fast_window": 50,
            "slow_window": 10,  # invalid: fast >= slow
            "fee_pct": 0.1,
            "initial_capital": 10000,
            "days": 200,
        },
        headers=auth_headers,
    )
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "INVALID_BACKTEST_PARAMETERS"


def test_run_backtest_unsupported_strategy_returns_400(client, auth_headers):
    response = client.post(
        "/api/v1/backtest/run",
        json={"strategy": "not_a_real_strategy", "days": 100},
        headers=auth_headers,
    )
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "UNSUPPORTED_STRATEGY"


def test_run_backtest_out_of_range_params_returns_422(client, auth_headers):
    response = client.post(
        "/api/v1/backtest/run",
        json={"strategy": "sma_crossover", "fast_window": 1, "days": 100},  # fast_window below min (2)
        headers=auth_headers,
    )
    assert response.status_code == 422


def test_backtest_history_returns_previous_runs(client, auth_headers):
    client.post(
        "/api/v1/backtest/run",
        json={"strategy": "sma_crossover", "fast_window": 10, "slow_window": 50, "days": 100},
        headers=auth_headers,
    )
    response = client.get("/api/v1/backtest/history", headers=auth_headers)
    assert response.status_code == 200
    assert len(response.json()["data"]) >= 1
