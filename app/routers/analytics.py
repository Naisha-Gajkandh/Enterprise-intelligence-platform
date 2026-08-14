from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.dependencies import get_current_user
from app.services import analytics_engine
from app.utils.responses import success

router = APIRouter(prefix="/api/v1/analytics", tags=["Analytics"])


@router.get("/kpis", response_model=schemas.APIResponse[schemas.KPISummary])
def kpis(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return success(schemas.KPISummary(**analytics_engine.get_kpi_summary(db)))


@router.get("/revenue-daily", response_model=schemas.APIResponse[list[schemas.DailyRevenuePoint]])
def revenue_daily(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    rows = analytics_engine.get_daily_revenue(db)
    return success([schemas.DailyRevenuePoint(**r) for r in rows])


@router.get("/categories", response_model=schemas.APIResponse[list[schemas.CategoryBreakdown]])
def categories(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    rows = analytics_engine.get_category_breakdown(db)
    return success([schemas.CategoryBreakdown(**r) for r in rows])


@router.get("/forecast", response_model=schemas.APIResponse[list[schemas.ForecastPoint]])
def forecast(
    days: int = Query(default=7, ge=1, le=30),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    rows = analytics_engine.forecast_next_days(db, n_days=days)
    return success([schemas.ForecastPoint(**r) for r in rows])
