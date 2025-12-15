from .data_loader import DataLoader
from .slope import calculate_slope
from .signals import apply_slope_filter, SignalType, TradeSignal, SignalResult
from .metrics import (
    calculate_performance_metrics,
    compute_yearly_stats,
    compute_cagr,
    PerformanceMetrics,
    YearlyStats
)

__all__ = [
    "DataLoader",
    "calculate_slope",
    "apply_slope_filter",
    "SignalType",
    "TradeSignal",
    "SignalResult",
    "calculate_performance_metrics",
    "compute_yearly_stats",
    "compute_cagr",
    "PerformanceMetrics",
    "YearlyStats"
]
