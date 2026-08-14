from datetime import datetime, date
from typing import Generic, TypeVar, Optional, Any

from pydantic import BaseModel, EmailStr, Field, ConfigDict

T = TypeVar("T")


# ---------------------------------------------------------------------------
# Generic response envelope — every endpoint returns this exact shape so the
# frontend never has to guess the response structure.
# Success: {"success": true, "data": {...}, "error": null}
# Failure: {"success": false, "data": null, "error": {"code": "...", "message": "..."}}
# ---------------------------------------------------------------------------
class ErrorDetail(BaseModel):
    code: str
    message: str


class APIResponse(BaseModel, Generic[T]):
    success: bool
    data: Optional[T] = None
    error: Optional[ErrorDetail] = None


# --- Auth ---
class SignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=1, max_length=255)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    email: str
    full_name: str
    created_at: datetime


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in_minutes: int
    user: UserResponse


# --- Backtesting ---
class BacktestRequest(BaseModel):
    strategy: str = Field(default="sma_crossover", description="Currently supported: sma_crossover")
    fast_window: int = Field(default=10, ge=2, le=200)
    slow_window: int = Field(default=50, ge=3, le=400)
    fee_pct: float = Field(default=0.1, ge=0, le=5, description="Per-trade fee as a percentage")
    initial_capital: float = Field(default=10000, gt=0)
    days: int = Field(default=365, ge=30, le=3650, description="Length of synthetic/seed price history to use")


class BacktestResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    strategy: str
    fast_window: int
    slow_window: int
    fee_pct: float
    initial_capital: float
    total_return_pct: float
    sharpe_ratio: float
    max_drawdown_pct: float
    cagr_pct: float
    win_rate_pct: float
    total_trades: int
    created_at: datetime


class EquityPoint(BaseModel):
    date: str
    equity: float


class BacktestRunResult(BaseModel):
    summary: BacktestResponse
    equity_curve: list[EquityPoint]


# --- Analytics ---
class KPISummary(BaseModel):
    total_revenue: float
    total_transactions: int
    average_order_value: float
    date_range_start: Optional[str]
    date_range_end: Optional[str]


class DailyRevenuePoint(BaseModel):
    date: str
    revenue: float
    transactions: int


class CategoryBreakdown(BaseModel):
    category: str
    total_revenue: float
    total_orders: int


class ForecastPoint(BaseModel):
    date: str
    predicted_revenue: float


# --- Assistant ---
class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=1000)


class ChatResponse(BaseModel):
    reply: str
    intent: str  # "structured_query" | "product_recommendation" | "general"
    sources: list[str] = []
