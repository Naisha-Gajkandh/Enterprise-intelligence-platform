from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.dependencies import get_current_user
from app.services.backtest_engine import run_sma_crossover_backtest
from app.utils.responses import success

router = APIRouter(prefix="/api/v1/backtest", tags=["Backtesting"])

SUPPORTED_STRATEGIES = {"sma_crossover"}


@router.post("/run", response_model=schemas.APIResponse[schemas.BacktestRunResult], status_code=status.HTTP_201_CREATED)
def run_backtest(
    payload: schemas.BacktestRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if payload.strategy not in SUPPORTED_STRATEGIES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "UNSUPPORTED_STRATEGY",
                "message": f"Strategy '{payload.strategy}' is not supported. Supported: {sorted(SUPPORTED_STRATEGIES)}",
            },
        )

    try:
        result = run_sma_crossover_backtest(
            fast_window=payload.fast_window,
            slow_window=payload.slow_window,
            fee_pct=payload.fee_pct,
            initial_capital=payload.initial_capital,
            days=payload.days,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "INVALID_BACKTEST_PARAMETERS", "message": str(e)},
        )

    run = models.BacktestRun(
        user_id=current_user.id,
        strategy=payload.strategy,
        fast_window=payload.fast_window,
        slow_window=payload.slow_window,
        fee_pct=payload.fee_pct,
        initial_capital=payload.initial_capital,
        total_return_pct=result["total_return_pct"],
        sharpe_ratio=result["sharpe_ratio"],
        max_drawdown_pct=result["max_drawdown_pct"],
        cagr_pct=result["cagr_pct"],
        win_rate_pct=result["win_rate_pct"],
        total_trades=result["total_trades"],
    )
    db.add(run)
    db.commit()
    db.refresh(run)

    return success(
        schemas.BacktestRunResult(
            summary=schemas.BacktestResponse.model_validate(run),
            equity_curve=[schemas.EquityPoint(**p) for p in result["equity_curve"]],
        )
    )


@router.get("/history", response_model=schemas.APIResponse[list[schemas.BacktestResponse]])
def get_history(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    runs = (
        db.query(models.BacktestRun)
        .filter(models.BacktestRun.user_id == current_user.id)
        .order_by(models.BacktestRun.created_at.desc())
        .all()
    )
    return success([schemas.BacktestResponse.model_validate(r) for r in runs])
