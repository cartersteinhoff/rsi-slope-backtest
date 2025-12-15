from fastapi import APIRouter, HTTPException, Query
from datetime import date
from typing import Optional

from services.data_loader import DataLoader
from models.schemas import TickersResponse, Candle

router = APIRouter()


@router.get("/tickers", response_model=TickersResponse)
def get_tickers():
    """Get list of all available tickers."""
    tickers = DataLoader.get_available_tickers()
    return TickersResponse(tickers=tickers)


@router.get("/tickers/{symbol}/candles")
def get_ticker_candles(
    symbol: str,
    start: Optional[date] = Query(None, description="Start date (YYYY-MM-DD)"),
    end: Optional[date] = Query(None, description="End date (YYYY-MM-DD)")
) -> dict:
    """Get OHLCV candle data for a specific ticker."""
    try:
        df = DataLoader.load_ticker_data(symbol)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"Ticker not found: {symbol}")

    # Filter by date range if provided
    if start:
        df = df[df["Date"] >= str(start)]
    if end:
        df = df[df["Date"] <= str(end)]

    # Convert to candle format for Lightweight Charts
    candles = []
    for _, row in df.iterrows():
        candles.append(Candle(
            time=int(row["Date"].timestamp()),
            open=float(row["Open"]),
            high=float(row["High"]),
            low=float(row["Low"]),
            close=float(row["Close"]),
            volume=int(row["Volume"]) if "Volume" in row else None
        ))

    return {"candles": candles}
