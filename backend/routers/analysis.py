from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse
from functools import lru_cache
from typing import Literal
from concurrent.futures import ThreadPoolExecutor, as_completed
import json
import re

import pandas as pd

from services.data_loader import DataLoader
from services.signals import apply_slope_filter, TradeSignal
from services.metrics import (
    calculate_performance_metrics,
    compute_yearly_stats,
    compute_cagr
)
from models.schemas import (
    IndividualAnalysisResponse,
    OverviewResponse,
    PerformanceMetrics as MetricsSchema,
    Trade,
    YearlyStats as YearlyStatsSchema,
    ChartData,
    Candle,
    SlopeSegment,
    ChartMarker,
    RSIDataPoint,
    BranchOverview
)

router = APIRouter()


def trades_to_schema(trades: list[TradeSignal]) -> list[Trade]:
    """Convert TradeSignal objects to Pydantic Trade models."""
    return [
        Trade(
            entry_date=t.entry_date.date(),
            exit_date=t.exit_date.date(),
            entry_price=round(t.entry_price, 2),
            exit_price=round(t.exit_price, 2),
            return_pct=round(t.return_pct, 2),
            days_held=t.days_held
        )
        for t in trades
    ]


def extract_rsi_threshold_from_branch(branch_name: str) -> float:
    """Extract RSI threshold from branch name.

    Branch format: {WINDOW}D_RSI_{TICKER}_{LT|GT}{THRESHOLD}_daily_trade_log
    Example: 14D_RSI_AAPL_LT30_daily_trade_log -> 30
    Example: 10D_RSI_AOR_GT53_daily_trade_log -> 53
    """
    match = re.search(r"_(?:LT|GT)(\d+)_", branch_name)
    if match:
        return float(match.group(1))
    return 30.0  # Default


def build_chart_data(
    merged_data: pd.DataFrame,
    trades: list[TradeSignal],
    pos_threshold: float,
    branch_name: str = ""
) -> ChartData:
    """Build chart data for Lightweight Charts.

    Returns candles, slope segments, entry/exit markers, RSI triggers, and RSI data.
    """
    df = merged_data.copy()
    rsi_threshold = extract_rsi_threshold_from_branch(branch_name)

    # Limit to last 5 years for performance
    if len(df) > 0:
        last_date = df['Date'].max()
        start_date = last_date - pd.DateOffset(years=5)
        df = df[df['Date'] >= start_date]

    # Build candles with real OHLC data for candlestick charts
    candles = []
    for _, row in df.iterrows():
        candles.append(Candle(
            time=int(row['Date'].timestamp()),
            open=float(row['Open']) if 'Open' in row and pd.notna(row['Open']) else float(row['Close']),
            high=float(row['High']) if 'High' in row and pd.notna(row['High']) else float(row['Close']),
            low=float(row['Low']) if 'Low' in row and pd.notna(row['Low']) else float(row['Close']),
            close=float(row['Close'])
        ))

    # Build slope segments (green when slope > threshold, gray otherwise)
    slope_segments = []
    if 'Slope' in df.columns:
        current_color = None
        segment_start = None

        for _, row in df.iterrows():
            slope = row['Slope']
            if pd.isna(slope):
                continue

            color = "green" if slope > pos_threshold else "gray"

            if current_color is None:
                current_color = color
                segment_start = int(row['Date'].timestamp())
            elif color != current_color:
                # End current segment
                slope_segments.append(SlopeSegment(
                    start=segment_start,
                    end=int(row['Date'].timestamp()),
                    color=current_color
                ))
                current_color = color
                segment_start = int(row['Date'].timestamp())

        # Close final segment
        if segment_start is not None and len(df) > 0:
            slope_segments.append(SlopeSegment(
                start=segment_start,
                end=int(df['Date'].iloc[-1].timestamp()),
                color=current_color
            ))

    # Build entry/exit markers from trades
    entries = []
    exits = []

    # Filter trades to match date range
    start_ts = df['Date'].min() if len(df) > 0 else None

    for trade in trades:
        if start_ts and trade.entry_date < start_ts:
            continue

        entries.append(ChartMarker(
            time=int(trade.entry_date.timestamp()),
            price=trade.entry_price,
            return_pct=trade.return_pct,  # Include return at entry for label
            entry_type=trade.entry_type
        ))
        exits.append(ChartMarker(
            time=int(trade.exit_date.timestamp()),
            price=trade.exit_price,
            return_pct=trade.return_pct,
            entry_type=trade.entry_type
        ))

    # Build RSI trigger markers (when Active transitions from 0 to 1)
    rsi_triggers = []
    if 'Active' in df.columns:
        prev_active = 0
        for _, row in df.iterrows():
            if row['Active'] == 1 and prev_active == 0:
                rsi_triggers.append(ChartMarker(
                    time=int(row['Date'].timestamp()),
                    price=float(row['Close'])
                ))
            prev_active = row['Active']

    # Build RSI data points
    rsi_data = []
    if 'RSI' in df.columns:
        for _, row in df.iterrows():
            if pd.notna(row['RSI']):
                rsi_data.append(RSIDataPoint(
                    time=int(row['Date'].timestamp()),
                    value=float(row['RSI'])
                ))

    return ChartData(
        candles=candles,
        slope_segments=slope_segments,
        entries=entries,
        exits=exits,
        rsi_triggers=rsi_triggers,
        rsi_data=rsi_data,
        rsi_threshold=rsi_threshold
    )


def extract_period_from_branch(branch_name: str, trades: list[TradeSignal]) -> str:
    """Extract or compute the period covered by trades."""
    if not trades:
        return "N/A"

    first_entry = min(t.entry_date for t in trades)
    last_exit = max(t.exit_date for t in trades)

    return f"{first_entry.strftime('%Y-%m-%d')} to {last_exit.strftime('%Y-%m-%d')}"


@router.get("/analysis/individual")
def get_individual_analysis(
    branch: str = Query(..., description="Branch name"),
    slope_window: int = Query(15, ge=5, le=30, description="Slope calculation window"),
    pos_threshold: float = Query(5.0, ge=0, le=20, description="Positive slope threshold"),
    neg_threshold: float = Query(0.0, ge=-10, le=10, description="Negative slope threshold"),
    signal_type: Literal["Both", "RSI", "Slope"] = Query("Both", description="Signal type")
) -> IndividualAnalysisResponse:
    """Get detailed analysis for a single branch."""

    # Load data
    try:
        branch_data = DataLoader.load_branch_data(branch)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"Branch not found: {branch}")

    ticker = DataLoader.extract_ticker_from_branch(branch)
    if not ticker:
        raise HTTPException(status_code=400, detail=f"Could not extract ticker from branch: {branch}")

    try:
        ticker_data = DataLoader.load_ticker_data(ticker)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"Ticker not found: {ticker}")

    # Apply slope filter and generate signals
    result = apply_slope_filter(
        branch_data,
        ticker_data,
        slope_window,
        pos_threshold,
        neg_threshold,
        signal_type
    )

    # Calculate metrics
    metrics = calculate_performance_metrics(result.trades)
    yearly_stats = compute_yearly_stats(result.trades)

    # Build chart data
    chart_data = build_chart_data(result.merged_data, result.trades, pos_threshold, branch)

    # Convert to response schema
    if metrics:
        metrics_schema = MetricsSchema(
            total_return=metrics.total_return,
            win_rate=metrics.win_rate,
            max_drawdown=metrics.max_drawdown,
            num_trades=metrics.num_trades,
            time_in_market=metrics.time_in_market,
            avg_days_held=metrics.avg_days_held,
            avg_return=metrics.avg_return,
            sharpe_ratio=metrics.sharpe_ratio,
            volatility=metrics.volatility
        )
    else:
        metrics_schema = MetricsSchema(
            total_return=0, win_rate=0, max_drawdown=0, num_trades=0,
            time_in_market=0, avg_days_held=0, avg_return=0,
            sharpe_ratio=0, volatility=0
        )

    yearly_schema = [
        YearlyStatsSchema(
            year=y.year,
            return_pct=y.return_pct,
            max_drawdown=y.max_drawdown,
            trades=y.trades,
            avg_hold=y.avg_hold
        )
        for y in yearly_stats
    ]

    return IndividualAnalysisResponse(
        metrics=metrics_schema,
        trades=trades_to_schema(result.trades),
        yearly_stats=yearly_schema,
        chart_data=chart_data
    )


@lru_cache(maxsize=50)
def _compute_branch_overview_cached(
    branch: str,
    slope_window: int,
    pos_threshold: float,
    neg_threshold: float,
    signal_type: str
) -> dict:
    """Cached computation for a single branch overview."""
    try:
        branch_data = DataLoader.load_branch_data(branch)
        ticker = DataLoader.extract_ticker_from_branch(branch)
        if not ticker:
            return None

        ticker_data = DataLoader.load_ticker_data(ticker)
    except FileNotFoundError:
        return None

    result = apply_slope_filter(
        branch_data,
        ticker_data,
        slope_window,
        pos_threshold,
        neg_threshold,
        signal_type
    )

    metrics = calculate_performance_metrics(result.trades)
    if not metrics or metrics.num_trades == 0:
        return None

    # Calculate period and CAGR
    period = extract_period_from_branch(branch, result.trades)

    if result.trades:
        first_entry = min(t.entry_date for t in result.trades)
        last_exit = max(t.exit_date for t in result.trades)
        years = (last_exit - first_entry).days / 365.25
        cagr = compute_cagr(metrics.total_return, years)
    else:
        cagr = 0.0

    return {
        "ticker": ticker,
        "branch": branch,
        "period": period,
        "return_pct": metrics.total_return,
        "cagr": cagr,
        "win_rate": metrics.win_rate,
        "max_drawdown": metrics.max_drawdown,
        "trades": metrics.num_trades,
        "sharpe": metrics.sharpe_ratio,
        "time_in_market": metrics.time_in_market
    }


@router.get("/analysis/overview", response_model=OverviewResponse)
def get_overview_analysis(
    slope_window: int = Query(15, ge=5, le=30, description="Slope calculation window"),
    pos_threshold: float = Query(5.0, ge=0, le=20, description="Positive slope threshold"),
    neg_threshold: float = Query(0.0, ge=-10, le=10, description="Negative slope threshold"),
    signal_type: Literal["Both", "RSI", "Slope"] = Query("Both", description="Signal type")
) -> OverviewResponse:
    """Get overview analysis for all branches (parallelized)."""

    branches = DataLoader.get_available_branches()
    overviews = []

    # Use thread pool for parallel processing
    with ThreadPoolExecutor(max_workers=8) as executor:
        futures = [
            executor.submit(
                _compute_branch_overview_cached,
                branch,
                slope_window,
                pos_threshold,
                neg_threshold,
                signal_type
            )
            for branch in branches
        ]

        for future in as_completed(futures):
            try:
                overview = future.result()
                if overview:
                    overviews.append(BranchOverview(**overview))
            except Exception:
                pass

    # Sort by return descending
    overviews.sort(key=lambda x: x.return_pct, reverse=True)

    return OverviewResponse(branches=overviews)


@router.get("/analysis/overview/stream")
def get_overview_analysis_stream(
    slope_window: int = Query(15, ge=5, le=30, description="Slope calculation window"),
    pos_threshold: float = Query(5.0, ge=0, le=20, description="Positive slope threshold"),
    neg_threshold: float = Query(0.0, ge=-10, le=10, description="Negative slope threshold"),
    signal_type: Literal["Both", "RSI", "Slope"] = Query("Both", description="Signal type")
):
    """Get overview analysis with SSE progress streaming (parallelized)."""

    def generate():
        branches = DataLoader.get_available_branches()
        total = len(branches)
        overviews = []
        completed = 0

        # Use thread pool for parallel processing
        with ThreadPoolExecutor(max_workers=8) as executor:
            # Submit all tasks
            future_to_branch = {
                executor.submit(
                    _compute_branch_overview_cached,
                    branch,
                    slope_window,
                    pos_threshold,
                    neg_threshold,
                    signal_type
                ): branch
                for branch in branches
            }

            # Process results as they complete
            for future in as_completed(future_to_branch):
                branch = future_to_branch[future]
                completed += 1

                # Send progress update
                progress_data = {
                    "type": "progress",
                    "current": completed,
                    "total": total,
                    "branch": branch,
                    "percent": round(completed / total * 100, 1)
                }
                yield f"data: {json.dumps(progress_data)}\n\n"

                try:
                    overview = future.result()
                    if overview:
                        overviews.append(overview)
                except Exception:
                    pass  # Skip failed branches

        # Sort by return descending
        overviews.sort(key=lambda x: x["return_pct"], reverse=True)

        # Send final result
        result_data = {
            "type": "complete",
            "branches": overviews
        }
        yield f"data: {json.dumps(result_data)}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )
