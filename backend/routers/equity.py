"""Equity chart API endpoints."""

from fastapi import APIRouter, HTTPException, Query
from datetime import date
from typing import Optional

from models.schemas import (
    EquityCurveResponse,
    DateRangeResponse,
    AlpacaAccountResponse,
    AlpacaPositionResponse,
)
from services.equity import compute_equity_curve, get_date_range
from services.config import has_alpaca_credentials

router = APIRouter()


@router.get("/equity/curve", response_model=EquityCurveResponse)
def get_equity_curve(
    start_date: Optional[date] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="End date (YYYY-MM-DD)"),
    initial_equity: float = Query(50000.0, description="Initial equity amount"),
) -> EquityCurveResponse:
    """
    Get equity curve data with daily returns and drawdowns.

    Returns equity data points, yearly statistics, and the live trading entry date.
    """
    try:
        result = compute_equity_curve(
            start_date=start_date,
            end_date=end_date,
            initial_equity=initial_equity,
        )
        return EquityCurveResponse(**result)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Equity data file not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/equity/date-range", response_model=DateRangeResponse)
def get_equity_date_range() -> DateRangeResponse:
    """Get the available date range for equity data."""
    try:
        result = get_date_range()
        return DateRangeResponse(**result)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Equity data file not found")


@router.get("/equity/alpaca/account", response_model=AlpacaAccountResponse)
def get_alpaca_account() -> AlpacaAccountResponse:
    """Get Alpaca account information."""
    if not has_alpaca_credentials():
        raise HTTPException(status_code=503, detail="Alpaca API not configured")

    try:
        from services.alpaca_client import get_alpaca_client
        client = get_alpaca_client()
        account = client.get_account()
        return AlpacaAccountResponse(**account)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/equity/alpaca/positions", response_model=list[AlpacaPositionResponse])
def get_alpaca_positions() -> list[AlpacaPositionResponse]:
    """Get current Alpaca positions."""
    if not has_alpaca_credentials():
        raise HTTPException(status_code=503, detail="Alpaca API not configured")

    try:
        from services.alpaca_client import get_alpaca_client
        client = get_alpaca_client()
        positions = client.get_positions()
        return [AlpacaPositionResponse(**p) for p in positions]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/equity/alpaca/status")
def get_alpaca_status() -> dict:
    """Check if Alpaca API is configured and accessible."""
    if not has_alpaca_credentials():
        return {"configured": False, "connected": False, "message": "API credentials not set"}

    try:
        from services.alpaca_client import get_alpaca_client
        client = get_alpaca_client()
        account = client.get_account()
        return {
            "configured": True,
            "connected": True,
            "account_status": account["status"],
        }
    except Exception as e:
        return {
            "configured": True,
            "connected": False,
            "message": str(e),
        }
