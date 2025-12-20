#!/usr/bin/env python3
"""
Script to create parquet files from CSV backtesting data.
Downloads OHLCV data from Yahoo Finance and computes RSI signals.
"""

import pandas as pd
import numpy as np
import yfinance as yf
from pathlib import Path
import re
from concurrent.futures import ThreadPoolExecutor, as_completed
import warnings
warnings.filterwarnings('ignore')

DATA_DIR = Path(__file__).parent / "data"
TICKERS_DIR = DATA_DIR / "tickers"
TRADE_LOGS_DIR = DATA_DIR / "trade_logs"

def parse_csv():
    """Parse the CSV file and extract ticker/condition info."""
    df = pd.read_csv('test-data.csv', header=1)
    df.columns = ['Base_Ticker', 'Investment_Ticker', 'Condition', 'TIMAR', 'MaxDD',
                  'Time_in_Market', 'Num_Trades', 'WinPct', 'ProfitPct', 'TIMAR1',
                  'Return', 'CAGR', 'Calmar_ratio']
    return df

def parse_condition(condition):
    """
    Parse condition string like '10d RSI AAXJ LT33 - L AAXJ' or '5d RSI ACWI GT44 - L VIXY'
    Returns: (window, ticker, direction, threshold)
    """
    # Pattern: {window}d RSI {ticker} {LT|GT}{threshold} - L {investment_ticker}
    match = re.match(r'(\d+)d RSI (\w+) (LT|GT)(\d+)', condition)
    if match:
        window = int(match.group(1))
        ticker = match.group(2)
        direction = match.group(3)  # LT (less than) or GT (greater than)
        threshold = int(match.group(4))
        return window, ticker, direction, threshold
    return None, None, None, None

def compute_rsi(prices, window=14):
    """Compute RSI indicator."""
    delta = prices.diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=window).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=window).mean()
    rs = gain / loss
    rsi = 100 - (100 / (1 + rs))
    return rsi

def download_ticker_data(ticker, start='2010-01-01', end='2025-12-31'):
    """Download OHLCV data for a ticker."""
    try:
        data = yf.download(ticker, start=start, end=end, progress=False)
        if data.empty:
            return None
        data = data.reset_index()
        # Handle multi-level columns from yfinance
        if isinstance(data.columns, pd.MultiIndex):
            data.columns = [col[0] if col[1] == '' else col[0] for col in data.columns]
        return data
    except Exception as e:
        print(f"  Error downloading {ticker}: {e}")
        return None

def create_trade_log(price_data, window, direction, threshold, ticker):
    """Create trade log with RSI signals."""
    df = price_data.copy()
    df['RSI'] = compute_rsi(df['Close'], window)

    # Determine Active signal based on direction
    if direction == 'LT':
        df['Active'] = (df['RSI'] < threshold).astype(int)
    else:  # GT
        df['Active'] = (df['RSI'] > threshold).astype(int)

    # Calculate daily returns
    df['Return_Pct'] = df['Close'].pct_change() * 100

    # Add metadata
    df['Signal_Type'] = 'RSI'
    df['Ticker'] = ticker

    # Select and clean columns
    result = df[['Date', 'RSI', 'Active', 'Return_Pct', 'Signal_Type', 'Ticker']].copy()
    result = result.dropna()

    return result

def main():
    print("Parsing CSV file...")
    df = parse_csv()
    print(f"Found {len(df)} branches")

    # Get unique tickers to download
    base_tickers = set(df['Base_Ticker'].dropna().unique())
    inv_tickers = set(df['Investment_Ticker'].dropna().unique())
    all_tickers = base_tickers | inv_tickers
    print(f"Total unique tickers to download: {len(all_tickers)}")

    # Create directories
    TICKERS_DIR.mkdir(parents=True, exist_ok=True)
    TRADE_LOGS_DIR.mkdir(parents=True, exist_ok=True)

    # Clear existing test data
    print("\nClearing existing test data...")
    for f in TICKERS_DIR.glob("TEST*.parquet"):
        f.unlink()
    for f in TRADE_LOGS_DIR.glob("*TEST*.parquet"):
        f.unlink()

    # Download ticker data
    print("\nDownloading ticker data...")
    ticker_data = {}
    failed_tickers = []

    for i, ticker in enumerate(sorted(all_tickers)):
        print(f"  [{i+1}/{len(all_tickers)}] Downloading {ticker}...", end=" ")
        data = download_ticker_data(ticker)
        if data is not None and len(data) > 50:
            ticker_data[ticker] = data
            # Save ticker parquet
            save_path = TICKERS_DIR / f"{ticker}.parquet"
            data.to_parquet(save_path, index=False)
            print(f"OK ({len(data)} rows)")
        else:
            failed_tickers.append(ticker)
            print("FAILED")

    print(f"\nSuccessfully downloaded: {len(ticker_data)} tickers")
    if failed_tickers:
        print(f"Failed to download: {len(failed_tickers)} tickers")
        print(f"  Failed: {', '.join(failed_tickers[:20])}{'...' if len(failed_tickers) > 20 else ''}")

    # Create trade logs for each branch
    print("\nCreating trade logs...")
    created = 0
    skipped = 0

    for i, row in df.iterrows():
        condition = row['Condition']
        investment_ticker = row['Investment_Ticker']
        window, ticker, direction, threshold = parse_condition(condition)

        if ticker is None or ticker not in ticker_data:
            skipped += 1
            continue

        # Create branch name: {WINDOW}D_RSI_{BASE_TICKER}_{DIR}{THRESHOLD}_{INVESTMENT_TICKER}_daily_trade_log
        branch_name = f"{window}D_RSI_{ticker}_{direction}{threshold}_{investment_ticker}_daily_trade_log"

        # Create trade log
        trade_log = create_trade_log(ticker_data[ticker], window, direction, threshold, ticker)

        # Save trade log parquet
        save_path = TRADE_LOGS_DIR / f"{branch_name}.parquet"
        trade_log.to_parquet(save_path, index=False)
        created += 1

        if created % 50 == 0:
            print(f"  Created {created} trade logs...")

    print(f"\nDone!")
    print(f"  Ticker parquet files: {len(ticker_data)}")
    print(f"  Trade log parquet files: {created}")
    print(f"  Skipped (missing ticker data): {skipped}")

if __name__ == "__main__":
    main()
