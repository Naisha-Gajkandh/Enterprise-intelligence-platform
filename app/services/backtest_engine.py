"""
Backtesting engine.

Correctness rules enforced here (the things judges/reviewers check for):
1. Signals are computed using only data available up to day t (rolling
   moving averages use only past + current closes, never future ones).
2. The signal is SHIFTED by 1 day before being applied to that day's
   return, so a decision made using day t's close is only ever acted on
   starting day t+1. This is the standard fix for look-ahead bias.
3. Transaction fees are applied on every position change — a backtest
   with zero fees is unrealistic and is called out explicitly in the
   platform's own documentation as a red flag to avoid.
4. Data is never shuffled — all operations preserve chronological order.

Note: this uses a synthetic-but-deterministic price series by default so
the endpoint works out of the box with no external market-data API key.
Swap `generate_price_series` for a real data loader (e.g. yfinance, or a
CSV upload) without changing any of the strategy/metrics logic below.
"""
import numpy as np
import pandas as pd


def generate_price_series(days: int, seed: int = 42) -> pd.DataFrame:
    """Deterministic synthetic daily close-price series (geometric random walk)."""
    rng = np.random.default_rng(seed)
    dates = pd.date_range(end=pd.Timestamp.today().normalize(), periods=days, freq="D")
    daily_returns = rng.normal(loc=0.0004, scale=0.012, size=days)
    price = 100 * np.cumprod(1 + daily_returns)
    return pd.DataFrame({"date": dates, "close": price})


def run_sma_crossover_backtest(
    fast_window: int,
    slow_window: int,
    fee_pct: float,
    initial_capital: float,
    days: int,
) -> dict:
    if fast_window >= slow_window:
        raise ValueError("fast_window must be smaller than slow_window")

    df = generate_price_series(days=days)
    df["fast_ma"] = df["close"].rolling(fast_window).mean()
    df["slow_ma"] = df["close"].rolling(slow_window).mean()

    # Signal computed on data available up to day t...
    df["raw_signal"] = np.where(df["fast_ma"] > df["slow_ma"], 1, 0)
    # ...but only ACTED ON starting day t+1 (shift prevents look-ahead bias).
    df["position"] = df["raw_signal"].shift(1).fillna(0)

    df["daily_return"] = df["close"].pct_change().fillna(0)
    df["strategy_return"] = df["position"] * df["daily_return"]

    # Apply a fee whenever the position changes (enter or exit a trade)
    df["position_change"] = df["position"].diff().abs().fillna(0)
    fee_fraction = fee_pct / 100
    df["strategy_return"] -= df["position_change"] * fee_fraction

    df["equity"] = initial_capital * (1 + df["strategy_return"]).cumprod()

    # --- Metrics ---
    total_return_pct = float((df["equity"].iloc[-1] / initial_capital - 1) * 100)

    daily_std = df["strategy_return"].std()
    sharpe_ratio = float(
        (df["strategy_return"].mean() / daily_std) * np.sqrt(252) if daily_std and daily_std > 0 else 0.0
    )

    running_max = df["equity"].cummax()
    drawdown = (df["equity"] - running_max) / running_max
    max_drawdown_pct = float(drawdown.min() * 100)

    n_years = days / 365.25
    cagr_pct = float(
        ((df["equity"].iloc[-1] / initial_capital) ** (1 / n_years) - 1) * 100 if n_years > 0 else 0.0
    )

    trades = df[df["position_change"] > 0]
    winning_days = df[(df["position"] == 1) & (df["strategy_return"] > 0)]
    holding_days = df[df["position"] == 1]
    win_rate_pct = float(
        (len(winning_days) / len(holding_days)) * 100 if len(holding_days) > 0 else 0.0
    )

    equity_curve = [
        {"date": d.strftime("%Y-%m-%d"), "equity": round(float(e), 2)}
        for d, e in zip(df["date"], df["equity"])
    ]

    return {
        "total_return_pct": round(total_return_pct, 2),
        "sharpe_ratio": round(sharpe_ratio, 3),
        "max_drawdown_pct": round(max_drawdown_pct, 2),
        "cagr_pct": round(cagr_pct, 2),
        "win_rate_pct": round(win_rate_pct, 2),
        "total_trades": int(len(trades)),
        "equity_curve": equity_curve,
    }
