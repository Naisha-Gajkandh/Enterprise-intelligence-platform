"""
Analytics engine.

- KPI / breakdown queries run through DuckDB, which can query a pandas
  DataFrame directly with SQL (`duckdb.query("... FROM df ...")`) — this
  gives fast columnar aggregation without standing up a separate OLAP
  server.
- The forecasting model is XGBoost, trained on daily-aggregated revenue
  with a strictly chronological train/test split so the model never
  learns from future data (the same anti-look-ahead-bias rule applied
  in the backtesting engine).
"""
from datetime import date

import duckdb
import numpy as np
import pandas as pd
import xgboost as xgb
from sqlalchemy.orm import Session
from sqlalchemy import func

from app import models

def _transactions_df(db: Session) -> pd.DataFrame:
    rows = db.query(
        models.Transaction.order_date,
        models.Transaction.category,
        models.Transaction.quantity,
        models.Transaction.revenue,
    ).all()
    return pd.DataFrame(rows, columns=["order_date", "category", "quantity", "revenue"])


def get_kpi_summary(db: Session) -> dict:
    df = _transactions_df(db)
    if df.empty:
        return {
            "total_revenue": 0.0,
            "total_transactions": 0,
            "average_order_value": 0.0,
            "date_range_start": None,
            "date_range_end": None,
        }

    result = duckdb.query(
        """
        SELECT
            SUM(revenue) AS total_revenue,
            COUNT(*) AS total_transactions,
            AVG(revenue) AS average_order_value,
            MIN(order_date) AS start_date,
            MAX(order_date) AS end_date
        FROM df
        """
    ).df()

    row = result.iloc[0]
    return {
        "total_revenue": round(float(row["total_revenue"]), 2),
        "total_transactions": int(row["total_transactions"]),
        "average_order_value": round(float(row["average_order_value"]), 2),
        "date_range_start": str(row["start_date"]),
        "date_range_end": str(row["end_date"]),
    }


def get_daily_revenue(db: Session) -> list[dict]:
    df = _transactions_df(db)
    if df.empty:
        return []

    result = duckdb.query(
        """
        SELECT order_date AS date, SUM(revenue) AS revenue, COUNT(*) AS transactions
        FROM df
        GROUP BY order_date
        ORDER BY order_date
        """
    ).df()
    return [
        {"date": str(r["date"]), "revenue": round(float(r["revenue"]), 2), "transactions": int(r["transactions"])}
        for _, r in result.iterrows()
    ]


def get_category_breakdown(db: Session) -> list[dict]:
    df = _transactions_df(db)
    if df.empty:
        return []

    result = duckdb.query(
        """
        SELECT category, SUM(revenue) AS total_revenue, COUNT(*) AS total_orders
        FROM df
        GROUP BY category
        ORDER BY total_revenue DESC
        """
    ).df()
    return [
        {"category": r["category"], "total_revenue": round(float(r["total_revenue"]), 2), "total_orders": int(r["total_orders"])}
        for _, r in result.iterrows()
    ]


def _build_features(daily: pd.DataFrame) -> pd.DataFrame:
    daily = daily.copy()
    daily["order_date"] = pd.to_datetime(daily["date"])
    daily["day_of_week"] = daily["order_date"].dt.dayofweek
    daily["day_of_month"] = daily["order_date"].dt.day
    daily["month"] = daily["order_date"].dt.month
    daily["is_weekend"] = daily["day_of_week"].isin([5, 6]).astype(int)
    daily["prev_day_revenue"] = daily["revenue"].shift(1)
    daily["prev_7day_avg"] = daily["revenue"].shift(1).rolling(7, min_periods=1).mean()
    return daily


FEATURES = ["day_of_week", "day_of_month", "month", "is_weekend", "prev_day_revenue", "prev_7day_avg"]


def train_forecast_model(db: Session):
    """Trains the XGBoost forecaster fresh on all currently available daily
    revenue. Uses a chronological split — never shuffles — to avoid
    look-ahead bias. Returns (model, last_row) or (None, None) if there
    isn't enough history yet. Always retrains rather than caching, so a
    forecast never reflects stale data from an earlier request.
    """
    daily_rows = get_daily_revenue(db)
    if len(daily_rows) < 14:
        return None, None

    daily = pd.DataFrame(daily_rows)
    daily = _build_features(daily).dropna().reset_index(drop=True)

    X = daily[FEATURES]
    y = daily["revenue"]

    split_point = max(int(len(daily) * 0.8), 1)
    X_train, y_train = X.iloc[:split_point], y.iloc[:split_point]

    model = xgb.XGBRegressor(n_estimators=200, max_depth=4, learning_rate=0.05, random_state=42)
    model.fit(X_train, y_train)

    return model, daily.iloc[-1]


def forecast_next_days(db: Session, n_days: int = 7) -> list[dict]:
    model, last_row = train_forecast_model(db)
    if model is None:
        return []

    predictions = []
    rolling_history = [last_row["revenue"]]
    current_date = pd.to_datetime(last_row["order_date"])

    for _ in range(n_days):
        current_date = current_date + pd.Timedelta(days=1)
        feature_row = pd.DataFrame([{
            "day_of_week": current_date.dayofweek,
            "day_of_month": current_date.day,
            "month": current_date.month,
            "is_weekend": int(current_date.dayofweek in (5, 6)),
            "prev_day_revenue": rolling_history[-1],
            "prev_7day_avg": float(np.mean(rolling_history[-7:])),
        }])
        pred = float(model.predict(feature_row[FEATURES])[0])
        pred = max(pred, 0.0)
        predictions.append({"date": current_date.strftime("%Y-%m-%d"), "predicted_revenue": round(pred, 2)})
        rolling_history.append(pred)

    return predictions
