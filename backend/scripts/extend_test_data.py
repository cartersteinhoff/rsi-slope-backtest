"""
Script to extend TEST ticker and trade_log data through 2025.
"""
import pandas as pd
import numpy as np
from pathlib import Path
from datetime import datetime, timedelta

DATA_DIR = Path(__file__).parent.parent / "data"
TICKERS_DIR = DATA_DIR / "tickers"
TRADE_LOGS_DIR = DATA_DIR / "trade_logs"

# Target end date
END_DATE = datetime(2025, 12, 15)


def calculate_rsi(prices: pd.Series, window: int = 14) -> pd.Series:
    """Calculate RSI indicator."""
    delta = prices.diff()
    gain = delta.where(delta > 0, 0.0)
    loss = -delta.where(delta < 0, 0.0)

    avg_gain = gain.rolling(window=window, min_periods=window).mean()
    avg_loss = loss.rolling(window=window, min_periods=window).mean()

    # Use Wilder's smoothing after initial period
    for i in range(window, len(prices)):
        avg_gain.iloc[i] = (avg_gain.iloc[i-1] * (window - 1) + gain.iloc[i]) / window
        avg_loss.iloc[i] = (avg_loss.iloc[i-1] * (window - 1) + loss.iloc[i]) / window

    rs = avg_gain / avg_loss
    rsi = 100 - (100 / (1 + rs))
    return rsi


def generate_synthetic_prices(last_close: float, num_days: int, volatility: float = 0.02, drift: float = 0.0001) -> pd.DataFrame:
    """Generate synthetic OHLCV data using geometric Brownian motion."""
    np.random.seed(42)  # For reproducibility

    # Generate daily returns
    returns = np.random.normal(drift, volatility, num_days)

    # Generate price path
    prices = [last_close]
    for r in returns:
        prices.append(prices[-1] * (1 + r))
    prices = np.array(prices[1:])

    # Generate OHLC from close prices
    ohlc_data = []
    for i, close in enumerate(prices):
        # Random intraday range
        daily_range = close * np.random.uniform(0.005, 0.03)
        high = close + daily_range * np.random.uniform(0.3, 1.0)
        low = close - daily_range * np.random.uniform(0.3, 1.0)

        # Open is typically near previous close
        if i == 0:
            open_price = last_close * (1 + np.random.uniform(-0.01, 0.01))
        else:
            open_price = prices[i-1] * (1 + np.random.uniform(-0.01, 0.01))

        # Ensure OHLC consistency
        high = max(high, open_price, close)
        low = min(low, open_price, close)

        ohlc_data.append({
            'Open': open_price,
            'High': high,
            'Low': low,
            'Close': close,
            'Adj Close': close,
            'Volume': int(np.random.uniform(1e6, 5e7))
        })

    return pd.DataFrame(ohlc_data)


def get_trading_days(start_date: datetime, end_date: datetime) -> list:
    """Generate list of trading days (exclude weekends)."""
    days = []
    current = start_date
    while current <= end_date:
        # Skip weekends
        if current.weekday() < 5:
            days.append(current)
        current += timedelta(days=1)
    return days


def extend_ticker_data(ticker_file: Path) -> None:
    """Extend a ticker's price data to END_DATE."""
    df = pd.read_parquet(ticker_file)

    # Get the last date and close price
    df['Date'] = pd.to_datetime(df['Date'])
    last_date = df['Date'].max()
    last_close = df.loc[df['Date'] == last_date, 'Close'].iloc[0]

    # Check if already up to date
    if last_date >= END_DATE:
        print(f"  {ticker_file.stem}: Already up to date ({last_date.date()})")
        return

    # Generate trading days for extension period
    start_date = last_date + timedelta(days=1)
    trading_days = get_trading_days(start_date, END_DATE)

    if not trading_days:
        print(f"  {ticker_file.stem}: No new days to add")
        return

    # Generate synthetic price data
    synthetic_df = generate_synthetic_prices(last_close, len(trading_days))
    synthetic_df['Date'] = trading_days

    # Combine with existing data
    combined_df = pd.concat([df, synthetic_df], ignore_index=True)
    combined_df = combined_df.sort_values('Date').reset_index(drop=True)

    # Save
    combined_df.to_parquet(ticker_file)
    print(f"  {ticker_file.stem}: Extended from {last_date.date()} to {END_DATE.date()} (+{len(trading_days)} days)")


def extend_trade_log_data(trade_log_file: Path) -> None:
    """Extend a trade log with RSI signals to END_DATE."""
    df = pd.read_parquet(trade_log_file)

    # Get the last date
    df['Date'] = pd.to_datetime(df['Date'])
    last_date = df['Date'].max()

    # Check if already up to date
    if last_date >= END_DATE:
        print(f"  {trade_log_file.stem}: Already up to date ({last_date.date()})")
        return

    # Extract ticker from filename
    # Format: 14D_RSI_TICKER_LT30_daily_trade_log.parquet
    parts = trade_log_file.stem.split('_')
    ticker = parts[2]  # e.g., TEST0000

    # Load corresponding ticker data
    ticker_file = TICKERS_DIR / f"{ticker}.parquet"
    if not ticker_file.exists():
        print(f"  {trade_log_file.stem}: Ticker file not found ({ticker})")
        return

    ticker_df = pd.read_parquet(ticker_file)
    ticker_df['Date'] = pd.to_datetime(ticker_df['Date'])

    # Get new dates from ticker data
    new_dates = ticker_df[ticker_df['Date'] > last_date]['Date'].tolist()

    if not new_dates:
        print(f"  {trade_log_file.stem}: No new dates from ticker data")
        return

    # Calculate RSI for the full ticker data
    ticker_df['RSI'] = calculate_rsi(ticker_df['Close'], window=14)

    # Extract RSI threshold from filename (e.g., LT30 -> 30)
    threshold_part = [p for p in parts if p.startswith('LT')][0]
    rsi_threshold = int(threshold_part[2:])

    # Generate new trade log entries
    new_entries = []
    for date in new_dates:
        row = ticker_df[ticker_df['Date'] == date].iloc[0]
        rsi_value = row['RSI']

        # Active = 1 when RSI < threshold
        active = 1 if rsi_value < rsi_threshold else 0

        # Generate some random return_pct for demonstration
        return_pct = np.random.uniform(-5, 8)

        new_entries.append({
            'Date': date,
            'RSI': int(rsi_value) if pd.notna(rsi_value) else 50,
            'Active': active,
            'Return_Pct': return_pct,
            'Signal_Type': 'RSI',
            'Ticker': ticker
        })

    # Combine with existing data
    new_df = pd.DataFrame(new_entries)
    combined_df = pd.concat([df, new_df], ignore_index=True)
    combined_df = combined_df.sort_values('Date').reset_index(drop=True)

    # Save
    combined_df.to_parquet(trade_log_file)
    print(f"  {trade_log_file.stem}: Extended from {last_date.date()} to {END_DATE.date()} (+{len(new_entries)} days)")


def main():
    print("=" * 60)
    print("Extending TEST data through", END_DATE.date())
    print("=" * 60)

    # First extend ticker data
    print("\nExtending ticker data...")
    test_ticker_files = sorted(TICKERS_DIR.glob("TEST*.parquet"))
    for ticker_file in test_ticker_files:
        extend_ticker_data(ticker_file)

    # Then extend trade log data
    print("\nExtending trade log data...")
    test_trade_log_files = sorted(TRADE_LOGS_DIR.glob("*TEST*.parquet"))
    for trade_log_file in test_trade_log_files:
        extend_trade_log_data(trade_log_file)

    print("\nDone!")


if __name__ == "__main__":
    main()
