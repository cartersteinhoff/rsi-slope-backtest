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


# Equity Chart Schemas

class EquityDataPoint(BaseModel):
    date: str  # ISO format YYYY-MM-DD
    equity: float
    daily_return: float  # Percentage
    drawdown_pct: float
    is_live: bool  # True if from live trading, False if backtest


class EquityYearlyStats(BaseModel):
    year: int
    profit_pct: float
    max_drawdown_pct: float
    start_equity: float
    end_equity: float


class EquityCurveResponse(BaseModel):
    system_name: str
    data: list[EquityDataPoint]
    yearly_stats: list[EquityYearlyStats]
    entry_date: str  # ISO date when live trading started


class DateRangeResponse(BaseModel):
    min_date: str
    max_date: str


class AlpacaAccountResponse(BaseModel):
    account_id: str
    cash: float
    portfolio_value: float
    buying_power: float
    equity: float
    last_equity: float
    status: str


class AlpacaPositionResponse(BaseModel):
    symbol: str
    qty: float
    avg_entry_price: float
    current_price: float
    market_value: float
    unrealized_pl: float
    unrealized_plpc: float
