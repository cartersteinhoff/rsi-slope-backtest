from dataclasses import dataclass
from enum import Enum
from typing import Literal

import numpy as np
import pandas as pd

from .slope import calculate_slope


class SignalType(str, Enum):
    BOTH = "Both"      # RSI activates flag, slope confirms entry
    RSI = "RSI"        # RSI only
    SLOPE = "Slope"    # Slope only


@dataclass
class TradeSignal:
    entry_date: pd.Timestamp
    exit_date: pd.Timestamp
    entry_price: float
    exit_price: float
    return_pct: float
    days_held: int
    entry_type: str = "Slope"  # "RSI" or "Slope"


@dataclass
class SignalResult:
    merged_data: pd.DataFrame
    trades: list[TradeSignal]


def apply_slope_filter(
    branch_data: pd.DataFrame,
    ticker_data: pd.DataFrame,
    slope_window: int,
    pos_threshold: float,
    neg_threshold: float,
    signal_type: Literal["Both", "RSI", "Slope"] = "Both"
) -> SignalResult:
    """Apply slope filtering with Flag-based trading logic.

    Args:
        branch_data: DataFrame with RSI/Active signals
        ticker_data: DataFrame with OHLCV data
        slope_window: Window size for slope calculation
        pos_threshold: Positive slope threshold for entry
        neg_threshold: Negative slope threshold (unused currently)
        signal_type: Trading signal type - "Both", "RSI", or "Slope"

    Returns:
        SignalResult with merged data and list of trades
    """
    # Merge branch data with ticker data (include OHLC for candlestick charts)
    merged = pd.merge(
        branch_data,
        ticker_data[['Date', 'Open', 'High', 'Low', 'Close', 'Volume']],
        on='Date',
        how='left'
    )
    merged = merged.sort_values('Date').reset_index(drop=True)

    # Calculate slope
    merged['Slope'] = calculate_slope(merged['Close'], slope_window)

    # Extract numpy arrays for fast access
    n = len(merged)
    slopes = merged['Slope'].values
    actives = merged['Active'].values
    closes = merged['Close'].values
    dates = merged['Date'].values

    # Pre-allocate output arrays
    flags = np.zeros(n, dtype=np.int32)
    entry_signals = np.zeros(n, dtype=np.int32)
    exit_signals = np.zeros(n, dtype=np.int32)
    in_trades = np.zeros(n, dtype=np.int32)

    # State variables
    flag = 0
    in_position = False
    entry_price = 0.0
    entry_date = None
    entry_type = "Slope"
    rsi_just_activated = False  # Track if RSI activated this bar
    prev_slope_active = False  # Track previous slope state for transition detection

    trades: list[TradeSignal] = []

    for i in range(n):
        slope = slopes[i]
        active = actives[i]
        close = closes[i]
        date = dates[i]

        if np.isnan(slope):
            flags[i] = flag
            continue

        # Detect slope transitions (matching POC logic)
        slope_active = slope > pos_threshold
        slope_just_activated = (not prev_slope_active) and slope_active
        slope_just_deactivated = prev_slope_active and (not slope_active)

        # Flag logic: Flag turns to 1 when RSI gets activated
        rsi_just_activated = False
        if active == 1 and flag == 0:
            flag = 1
            rsi_just_activated = True

        trade_completed = False
        exit_price = 0.0
        exit_date = None

        if signal_type == "Both":
            # BOTH: RSI activates flag, slope confirms entry via TRANSITIONS (matching POC)
            # Entry case 1: RSI just triggered AND slope is already active → enter immediately
            if not in_position and rsi_just_activated and slope_active:
                in_position = True
                entry_price = close
                entry_date = date
                entry_type = "RSI"
                entry_signals[i] = 1
                in_trades[i] = 1
            # Entry case 2: RSI triggered previously (flag=1), slope just activated → enter
            elif not in_position and flag == 1 and slope_just_activated:
                in_position = True
                entry_price = close
                entry_date = date
                entry_type = "Slope"
                entry_signals[i] = 1
                in_trades[i] = 1
            # In position: check for exit on slope DEACTIVATION (transition-based)
            elif in_position:
                in_trades[i] = 1
                if slope_just_deactivated:
                    in_position = False
                    exit_signals[i] = 1
                    in_trades[i] = 0
                    flag = 0
                    trade_completed = True
                    exit_price = close
                    exit_date = date

        elif signal_type == "RSI":
            # RSI ONLY: Enter when Active turns 1, exit when it turns 0
            if not in_position and active == 1:
                in_position = True
                entry_price = close
                entry_date = date
                entry_type = "RSI"
                entry_signals[i] = 1
                in_trades[i] = 1
            elif in_position:
                in_trades[i] = 1
                if active == 0:
                    in_position = False
                    exit_signals[i] = 1
                    in_trades[i] = 0
                    trade_completed = True
                    exit_price = close
                    exit_date = date

        elif signal_type == "Slope":
            # SLOPE ONLY: Enter when slope > threshold, exit when slope <= threshold
            if not in_position and slope > pos_threshold:
                in_position = True
                entry_price = close
                entry_date = date
                entry_type = "Slope"
                entry_signals[i] = 1
                in_trades[i] = 1
            elif in_position:
                in_trades[i] = 1
                if slope <= pos_threshold:
                    in_position = False
                    exit_signals[i] = 1
                    in_trades[i] = 0
                    trade_completed = True
                    exit_price = close
                    exit_date = date

        # Record completed trade
        if trade_completed and entry_price != 0:
            trade_return = (exit_price - entry_price) / entry_price * 100
            days_held = (pd.Timestamp(exit_date) - pd.Timestamp(entry_date)).days
            trades.append(TradeSignal(
                entry_date=pd.Timestamp(entry_date),
                exit_date=pd.Timestamp(exit_date),
                entry_price=entry_price,
                exit_price=exit_price,
                return_pct=trade_return,
                days_held=days_held,
                entry_type=entry_type
            ))

        flags[i] = flag
        prev_slope_active = slope_active  # Update for next iteration

    # Write arrays back to dataframe
    merged['Flag'] = flags
    merged['Entry_Signal'] = entry_signals
    merged['Exit_Signal'] = exit_signals
    merged['InTrade'] = in_trades

    return SignalResult(merged_data=merged, trades=trades)
