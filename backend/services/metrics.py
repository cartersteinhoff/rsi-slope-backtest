from dataclasses import dataclass, asdict
from typing import Optional

import numpy as np
import pandas as pd

from .signals import TradeSignal


@dataclass
class PerformanceMetrics:
    total_return: float
    win_rate: float
    max_drawdown: float
    num_trades: int
    time_in_market: float
    avg_days_held: float
    avg_return: float
    sharpe_ratio: float
    volatility: float

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class YearlyStats:
    year: int
    return_pct: float
    max_drawdown: float
    trades: int
    avg_hold: float

    def to_dict(self) -> dict:
        return asdict(self)


def calculate_max_drawdown(returns: np.ndarray) -> float:
    """Calculate maximum drawdown from a series of returns.

    Args:
        returns: Array of percentage returns

    Returns:
        Maximum drawdown as a negative percentage
    """
    if len(returns) == 0:
        return 0.0

    # Build equity curve
    equity = np.cumprod(1 + np.array(returns) / 100.0)
    running_max = np.maximum.accumulate(equity)
    drawdown = (equity / running_max - 1.0) * 100

    return float(np.min(drawdown))


def calculate_sharpe_ratio(returns: np.ndarray, risk_free_rate: float = 0.02) -> float:
    """Calculate annualized Sharpe ratio.

    Args:
        returns: Array of percentage returns
        risk_free_rate: Annual risk-free rate (default 2%)

    Returns:
        Annualized Sharpe ratio
    """
    if len(returns) == 0:
        return 0.0

    std = np.std(returns)
    if std == 0:
        return 0.0

    # Daily risk-free rate
    daily_rf = risk_free_rate / 252
    excess_returns = np.mean(returns) / 100.0 - daily_rf

    # Annualize
    return (excess_returns * np.sqrt(252)) / (std / 100.0)


def calculate_performance_metrics(trades: list[TradeSignal]) -> Optional[PerformanceMetrics]:
    """Calculate comprehensive performance metrics from trades.

    Args:
        trades: List of TradeSignal objects

    Returns:
        PerformanceMetrics or None if no trades
    """
    if not trades:
        return None

    returns = np.array([t.return_pct for t in trades])
    days_held = np.array([t.days_held for t in trades])

    # Basic metrics
    total_return = float(np.sum(returns))
    num_trades = len(trades)
    win_rate = float(len(returns[returns > 0]) / num_trades * 100)
    avg_return = float(np.mean(returns))
    avg_days_held = float(np.mean(days_held))

    # Risk metrics
    max_drawdown = calculate_max_drawdown(returns)
    sharpe_ratio = calculate_sharpe_ratio(returns)
    volatility = float(np.std(returns))

    # Time in market
    total_days_in_market = int(np.sum(days_held))
    first_entry = min(t.entry_date for t in trades)
    last_exit = max(t.exit_date for t in trades)
    date_range = (last_exit - first_entry).days

    time_in_market = (total_days_in_market / date_range * 100) if date_range > 0 else 0.0

    return PerformanceMetrics(
        total_return=round(total_return, 2),
        win_rate=round(win_rate, 2),
        max_drawdown=round(max_drawdown, 2),
        num_trades=num_trades,
        time_in_market=round(time_in_market, 2),
        avg_days_held=round(avg_days_held, 2),
        avg_return=round(avg_return, 2),
        sharpe_ratio=round(sharpe_ratio, 2),
        volatility=round(volatility, 2)
    )


def compute_yearly_stats(trades: list[TradeSignal]) -> list[YearlyStats]:
    """Compute per-year statistics.

    Args:
        trades: List of TradeSignal objects

    Returns:
        List of YearlyStats, one per year
    """
    if not trades:
        return []

    # Group trades by exit year
    trades_by_year: dict[int, list[TradeSignal]] = {}
    for trade in trades:
        year = trade.exit_date.year
        if year not in trades_by_year:
            trades_by_year[year] = []
        trades_by_year[year].append(trade)

    yearly_stats = []
    for year in sorted(trades_by_year.keys()):
        year_trades = trades_by_year[year]
        returns = np.array([t.return_pct for t in year_trades])

        # Total return (sum of trade returns)
        total_return = float(np.sum(returns))

        # Max drawdown for this year
        max_dd = calculate_max_drawdown(returns)

        # Average hold time
        avg_hold = float(np.mean([t.days_held for t in year_trades]))

        yearly_stats.append(YearlyStats(
            year=year,
            return_pct=round(total_return, 2),
            max_drawdown=round(max_dd, 2),
            trades=len(year_trades),
            avg_hold=round(avg_hold, 1)
        ))

    return yearly_stats


def compute_cagr(total_return_pct: float, years: float) -> float:
    """Calculate Compound Annual Growth Rate.

    Args:
        total_return_pct: Total return as percentage
        years: Number of years

    Returns:
        CAGR as percentage
    """
    if years <= 0:
        return 0.0

    # Convert percentage to multiplier
    total_multiplier = 1 + (total_return_pct / 100)

    if total_multiplier <= 0:
        return -100.0

    # CAGR formula
    cagr = (total_multiplier ** (1 / years) - 1) * 100

    return round(cagr, 2)
