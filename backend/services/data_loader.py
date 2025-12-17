import pandas as pd
from pathlib import Path
from functools import lru_cache
import re

DATA_DIR = Path(__file__).parent.parent / "data"
TICKERS_DIR = DATA_DIR / "tickers"
TRADE_LOGS_DIR = DATA_DIR / "trade_logs"


class DataLoader:
    @staticmethod
    @lru_cache(maxsize=100)
    def load_ticker_data(ticker: str) -> pd.DataFrame:
        """Load ticker OHLCV data from parquet file."""
        file_path = TICKERS_DIR / f"{ticker}.parquet"
        if not file_path.exists():
            raise FileNotFoundError(f"Ticker data not found: {ticker}")
        df = pd.read_parquet(file_path)
        df["Date"] = pd.to_datetime(df["Date"])
        return df.sort_values("Date")

    @staticmethod
    @lru_cache(maxsize=100)
    def load_branch_data(branch_name: str) -> pd.DataFrame:
        """Load branch trade log data from parquet file."""
        file_path = TRADE_LOGS_DIR / f"{branch_name}.parquet"
        if not file_path.exists():
            raise FileNotFoundError(f"Branch data not found: {branch_name}")
        df = pd.read_parquet(file_path)
        df["Date"] = pd.to_datetime(df["Date"])
        return df.sort_values("Date")

    @staticmethod
    @lru_cache(maxsize=1)
    def get_available_tickers() -> list[str]:
        """Get list of all available tickers."""
        if not TICKERS_DIR.exists():
            return []
        tickers = [f.stem for f in TICKERS_DIR.glob("*.parquet")]
        return sorted(tickers)

    @staticmethod
    @lru_cache(maxsize=1)
    def get_available_branches() -> list[str]:
        """Get list of all available branches."""
        if not TRADE_LOGS_DIR.exists():
            return []
        branches = [f.stem for f in TRADE_LOGS_DIR.glob("*.parquet")]
        return sorted(branches)

    @staticmethod
    def extract_ticker_from_branch(branch_name: str) -> str:
        """Extract ticker symbol from branch name.

        Branch format: {WINDOW}D_RSI_{TICKER}_{LT|GT}{THRESHOLD}_daily_trade_log
        Example: 14D_RSI_AAPL_LT30_daily_trade_log -> AAPL
        Example: 10D_RSI_AOR_GT53_daily_trade_log -> AOR
        """
        match = re.search(r"_RSI_(.+?)_(?:LT|GT)", branch_name)
        if match:
            return match.group(1)
        return ""

    @staticmethod
    def get_branches_for_ticker(ticker: str) -> list[str]:
        """Get all branches for a specific ticker."""
        all_branches = DataLoader.get_available_branches()
        return [
            b for b in all_branches
            if DataLoader.extract_ticker_from_branch(b) == ticker
        ]

    @staticmethod
    def clear_cache():
        """Clear all cached data."""
        DataLoader.load_ticker_data.cache_clear()
        DataLoader.load_branch_data.cache_clear()
        DataLoader.get_available_tickers.cache_clear()
        DataLoader.get_available_branches.cache_clear()
