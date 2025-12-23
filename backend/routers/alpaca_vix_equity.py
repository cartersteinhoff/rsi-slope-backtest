"""Alpaca + VIX ETF System equity chart API endpoints."""

from fastapi import APIRouter, HTTPException, Query
from datetime import date
from typing import Optional

from models.schemas import EquityCurveResponse, DateRangeResponse
from services.alpaca_vix_equity import (
    compute_alpaca_vix_equity_curve,
    get_alpaca_vix_date_range,
)

router = APIRouter()


@router.get("/alpaca-vix-equity/curve", response_model=EquityCurveResponse)
def get_alpaca_vix_equity_curve(
    start_date: Optional[date] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="End date (YYYY-MM-DD)"),
    initial_equity: float = Query(50000.0, description="Initial equity amount"),
) -> EquityCurveResponse:
    """
    Get Alpaca + VIX ETF System equity curve data with daily returns and drawdowns.

    Returns equity data points and yearly statistics.
    """
    try:
        result = compute_alpaca_vix_equity_curve(
            start_date=start_date,
            end_date=end_date,
            initial_equity=initial_equity,
        )
        return EquityCurveResponse(**result)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Alpaca + VIX equity data file not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/alpaca-vix-equity/date-range", response_model=DateRangeResponse)
def get_alpaca_vix_equity_date_range() -> DateRangeResponse:
    """Get the available date range for Alpaca + VIX equity data."""
    try:
        result = get_alpaca_vix_date_range()
        return DateRangeResponse(**result)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Alpaca + VIX equity data file not found")
