"""Alpaca + VIX ETF System equity curve data service."""

import pandas as pd
from pathlib import Path
from datetime import date
from typing import Optional
from functools import lru_cache

# Data path
DATA_DIR = Path(__file__).parent.parent / "data"
ALPACA_VIX_EQUITY_DATA_PATH = DATA_DIR / "alpaca_vix_equity_data.csv"
SPY_PRICES_PATH = DATA_DIR / "spy_prices.csv"


@lru_cache(maxsize=1)
def _load_alpaca_vix_equity_csv() -> pd.DataFrame:
    """Load and cache the Alpaca + VIX equity data CSV."""
    df = pd.read_csv(ALPACA_VIX_EQUITY_DATA_PATH)
    df = df[["Date", "Portfolio_Return"]].copy()
    df["Date"] = pd.to_datetime(df["Date"])
    df = df.sort_values("Date").reset_index(drop=True)
    return df


@lru_cache(maxsize=1)
def _load_spy_prices() -> pd.DataFrame:
    """Load and cache SPY price data."""
    df = pd.read_csv(SPY_PRICES_PATH)
    df["date"] = pd.to_datetime(df["date"])
    df = df.sort_values("date").reset_index(drop=True)
    return df


def compute_alpaca_vix_equity_curve(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    initial_equity: float = 50000.0,
) -> dict:
    """
    Compute equity curve from daily returns for Alpaca + VIX ETF System.

    Returns:
        dict with keys:
        - data: list of {date, equity, daily_return, drawdown_pct, is_live, spy_equity}
        - yearly_stats: list of {year, profit_pct, max_drawdown_pct, start_equity, end_equity}
        - entry_date: ISO date string (placeholder)
        - system_name: "Alpaca + VIX ETF System"
    """
    df = _load_alpaca_vix_equity_csv().copy()
    spy_df = _load_spy_prices().copy()

    # Filter by date range
    if start_date:
        df = df[df["Date"] >= pd.Timestamp(start_date)]
    if end_date:
        df = df[df["Date"] <= pd.Timestamp(end_date)]

    if df.empty:
        return {
            "data": [],
            "yearly_stats": [],
            "entry_date": "2025-12-18",
            "system_name": "Alpaca + VIX ETF System",
        }

    # Compute equity from daily returns
    df["daily_return"] = df["Portfolio_Return"]
    df["equity"] = (1 + df["daily_return"]).cumprod() * initial_equity
    df["is_live"] = False  # All data is backtest for now

    # Compute drawdown
    df["peak"] = df["equity"].cummax()
    df["drawdown_pct"] = (df["peak"] - df["equity"]) / df["peak"] * 100

    # Merge SPY data - normalize SPY to match system equity on first overlapping date
    df["date_str"] = df["Date"].dt.strftime("%Y-%m-%d")
    spy_df["date_str"] = spy_df["date"].dt.strftime("%Y-%m-%d")

    # Get SPY prices for matching dates
    spy_dict = dict(zip(spy_df["date_str"], spy_df["close"]))

    # Find first date where both system and SPY have data
    first_spy_date = None
    first_spy_price = None
    first_system_equity = None
    for _, row in df.iterrows():
        date_str = row["date_str"]
        if date_str in spy_dict:
            first_spy_date = date_str
            first_spy_price = spy_dict[date_str]
            first_system_equity = row["equity"]
            break

    # Build data points
    data = []
    for _, row in df.iterrows():
        date_str = row["date_str"]
        spy_price = spy_dict.get(date_str)
        spy_equity = None
        if spy_price is not None and first_spy_price is not None and first_system_equity is not None:
            # Normalize SPY to start at same equity as system on first overlapping date
            spy_equity = round((spy_price / first_spy_price) * first_system_equity, 2)

        data.append({
            "date": date_str,
            "equity": round(row["equity"], 2),
            "daily_return": round(row["daily_return"] * 100, 4),
            "drawdown_pct": round(row["drawdown_pct"], 2),
            "is_live": bool(row["is_live"]),
            "spy_equity": spy_equity,
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
        "entry_date": "2025-12-18",
        "system_name": "Alpaca + VIX ETF System",
    }


def get_alpaca_vix_date_range() -> dict:
    """Get the available date range from the data."""
    df = _load_alpaca_vix_equity_csv()
    return {
        "min_date": df["Date"].min().strftime("%Y-%m-%d"),
        "max_date": df["Date"].max().strftime("%Y-%m-%d"),
    }
