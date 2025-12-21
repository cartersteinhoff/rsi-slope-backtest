"""Equity curve data service."""

import pandas as pd
import numpy as np
from pathlib import Path
from datetime import date, datetime, timedelta
from typing import Optional
from functools import lru_cache

from .config import EQUITY_DATA_PATH, LIVE_ENTRY_DATE, has_alpaca_credentials


@lru_cache(maxsize=1)
def _load_equity_csv() -> pd.DataFrame:
    """Load and cache the equity data CSV."""
    df = pd.read_csv(EQUITY_DATA_PATH, skiprows=1)  # Skip the title row
    df.columns = ["Date", "Portfolio_Return", "Active_Branches"]
    df["Date"] = pd.to_datetime(df["Date"])
    df = df.sort_values("Date").reset_index(drop=True)
    return df


def _fetch_alpaca_history(start_date: date) -> Optional[pd.DataFrame]:
    """Fetch portfolio history from Alpaca API starting from the given date."""
    if not has_alpaca_credentials():
        return None

    try:
        from .alpaca_client import get_alpaca_client
        client = get_alpaca_client()

        history = client.get_portfolio_history(
            period="all",
            timeframe="1D",
            start_date=datetime.combine(start_date, datetime.min.time()),
        )

        if not history["timestamps"]:
            return None

        # Convert timestamps to dates and build DataFrame
        dates = [datetime.fromtimestamp(ts).date() for ts in history["timestamps"]]

        df = pd.DataFrame({
            "Date": pd.to_datetime(dates),
            "equity": history["equity"],
            "profit_loss_pct": history["profit_loss_pct"],
        })

        # Calculate daily returns from profit/loss percentage
        df["daily_return"] = df["profit_loss_pct"].diff().fillna(0) / 100

        return df
    except Exception as e:
        print(f"Error fetching Alpaca history: {e}")
        return None


def compute_equity_curve(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    initial_equity: float = 50000.0,
) -> dict:
    """
    Compute equity curve from daily returns.

    Combines:
    - Historical backtest data from CSV (before entry date)
    - Live trading data from Alpaca API (from entry date onwards)

    Returns:
        dict with keys:
        - data: list of {date, equity, daily_return, drawdown_pct, is_live}
        - yearly_stats: list of {year, profit_pct, max_drawdown_pct, start_equity, end_equity}
        - entry_date: ISO date string when live trading started
    """
    # Load CSV data (historical backtest)
    csv_df = _load_equity_csv().copy()

    entry_ts = pd.Timestamp(LIVE_ENTRY_DATE)

    # Get historical data (before entry date)
    historical_df = csv_df[csv_df["Date"] < entry_ts].copy()
    historical_df["daily_return"] = historical_df["Portfolio_Return"]
    historical_df["is_live"] = False

    # Compute equity for historical data
    if not historical_df.empty:
        historical_df["equity"] = (1 + historical_df["daily_return"]).cumprod() * initial_equity
        last_historical_equity = historical_df["equity"].iloc[-1]
    else:
        last_historical_equity = initial_equity

    # Fetch live data from Alpaca
    alpaca_df = _fetch_alpaca_history(LIVE_ENTRY_DATE)

    if alpaca_df is not None and not alpaca_df.empty:
        # Filter Alpaca data to start from entry date
        alpaca_df = alpaca_df[alpaca_df["Date"] >= entry_ts].copy()
        alpaca_df["is_live"] = True

        # Scale Alpaca equity to continue from historical equity
        if not alpaca_df.empty:
            alpaca_start_equity = alpaca_df["equity"].iloc[0]
            if alpaca_start_equity > 0:
                scale_factor = last_historical_equity / alpaca_start_equity
                alpaca_df["equity"] = alpaca_df["equity"] * scale_factor

        # Combine historical and live data
        df = pd.concat([historical_df, alpaca_df], ignore_index=True)
    else:
        # No Alpaca data available, use only historical
        df = historical_df.copy()

    # Filter by date range
    if start_date:
        df = df[df["Date"] >= pd.Timestamp(start_date)]
    if end_date:
        df = df[df["Date"] <= pd.Timestamp(end_date)]

    if df.empty:
        return {"data": [], "yearly_stats": [], "entry_date": LIVE_ENTRY_DATE.isoformat()}

    # Compute drawdown
    df["peak"] = df["equity"].cummax()
    df["drawdown_pct"] = (df["peak"] - df["equity"]) / df["peak"] * 100

    # Build data points
    data = []
    for _, row in df.iterrows():
        data.append({
            "date": row["Date"].strftime("%Y-%m-%d"),
            "equity": round(row["equity"], 2),
            "daily_return": round(row["daily_return"] * 100, 4),  # Convert to percentage
            "drawdown_pct": round(row["drawdown_pct"], 2),
            "is_live": bool(row["is_live"]),
        })

    # Compute yearly stats
    df["year"] = df["Date"].dt.year
    yearly_stats = []

    for year, group in df.groupby("year"):
        if len(group) < 2:
            continue

        start_equity = group["equity"].iloc[0]
        end_equity = group["equity"].iloc[-1]
        profit_pct = (end_equity / start_equity - 1) * 100 if start_equity > 0 else 0
        max_dd = group["drawdown_pct"].max()

        yearly_stats.append({
            "year": int(year),
            "profit_pct": round(profit_pct, 2),
            "max_drawdown_pct": round(max_dd, 2),
            "start_equity": round(start_equity, 2),
            "end_equity": round(end_equity, 2),
        })

    return {
        "data": data,
        "yearly_stats": yearly_stats,
        "entry_date": LIVE_ENTRY_DATE.isoformat(),
        "system_name": "Alpaca + VIX System",
    }


def get_date_range() -> dict:
    """Get the available date range from the data."""
    df = _load_equity_csv()
    return {
        "min_date": df["Date"].min().strftime("%Y-%m-%d"),
        "max_date": df["Date"].max().strftime("%Y-%m-%d"),
    }
