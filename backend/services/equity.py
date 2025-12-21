"""Equity curve data service."""

import pandas as pd
import numpy as np
from pathlib import Path
from datetime import date, datetime
from typing import Optional
from functools import lru_cache

from .config import EQUITY_DATA_PATH, LIVE_ENTRY_DATE


@lru_cache(maxsize=1)
def _load_equity_csv() -> pd.DataFrame:
    """Load and cache the equity data CSV."""
    df = pd.read_csv(EQUITY_DATA_PATH, skiprows=1)  # Skip the title row
    df.columns = ["Date", "Portfolio_Return", "Active_Branches"]
    df["Date"] = pd.to_datetime(df["Date"])
    df = df.sort_values("Date").reset_index(drop=True)
    return df


def compute_equity_curve(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    initial_equity: float = 50000.0,
) -> dict:
    """
    Compute equity curve from daily returns.

    Returns:
        dict with keys:
        - data: list of {date, equity, daily_return, drawdown_pct, is_live}
        - yearly_stats: list of {year, profit_pct, max_drawdown_pct, start_equity, end_equity}
        - entry_date: ISO date string when live trading started
    """
    df = _load_equity_csv().copy()

    # Filter by date range
    if start_date:
        df = df[df["Date"] >= pd.Timestamp(start_date)]
    if end_date:
        df = df[df["Date"] <= pd.Timestamp(end_date)]

    if df.empty:
        return {"data": [], "yearly_stats": [], "entry_date": LIVE_ENTRY_DATE.isoformat()}

    # Compute equity curve
    df["daily_return"] = df["Portfolio_Return"]
    df["equity"] = (1 + df["daily_return"]).cumprod() * initial_equity

    # Compute drawdown
    df["peak"] = df["equity"].cummax()
    df["drawdown_pct"] = (df["peak"] - df["equity"]) / df["peak"] * 100

    # Mark live vs backtest
    entry_ts = pd.Timestamp(LIVE_ENTRY_DATE)
    df["is_live"] = df["Date"] >= entry_ts

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
