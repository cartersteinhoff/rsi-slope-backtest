from pydantic import BaseModel
from datetime import date
from typing import Optional


class Candle(BaseModel):
    time: int  # Unix timestamp
    open: float
    high: float
    low: float
    close: float
    volume: Optional[int] = None


class Trade(BaseModel):
    entry_date: date
    exit_date: date
    entry_price: float
    exit_price: float
    return_pct: float
    days_held: int


class YearlyStats(BaseModel):
    year: int
    return_pct: float
    max_drawdown: float
    trades: int
    avg_hold: float


class PerformanceMetrics(BaseModel):
    total_return: float
    win_rate: float
    max_drawdown: float
    num_trades: int
    time_in_market: float
    avg_days_held: float
    avg_return: float
    sharpe_ratio: float
    volatility: float


class SlopeSegment(BaseModel):
    start: int  # Unix timestamp
    end: int
    color: str  # "green" or "gray"


class ChartMarker(BaseModel):
    time: int
    price: float
    return_pct: Optional[float] = None
    entry_type: Optional[str] = None  # "RSI" or "Slope"


class RSIDataPoint(BaseModel):
    time: int
    value: float


class ChartData(BaseModel):
    candles: list[Candle]
    slope_segments: list[SlopeSegment]
    entries: list[ChartMarker]
    exits: list[ChartMarker]
    rsi_triggers: list[ChartMarker]
    rsi_data: list[RSIDataPoint]
    rsi_threshold: float


class IndividualAnalysisResponse(BaseModel):
    metrics: PerformanceMetrics
    trades: list[Trade]
    yearly_stats: list[YearlyStats]
    chart_data: ChartData


class BranchOverview(BaseModel):
    ticker: str
    branch: str
    period: str
    return_pct: float
    cagr: float
    win_rate: float
    max_drawdown: float
    trades: int
    sharpe: float
    time_in_market: float


class OverviewResponse(BaseModel):
    branches: list[BranchOverview]


class TickersResponse(BaseModel):
    tickers: list[str]


class BranchesResponse(BaseModel):
    branches: list[str]
