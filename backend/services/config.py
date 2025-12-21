"""Configuration service for environment variables."""

import os
from pathlib import Path
from dotenv import load_dotenv
from datetime import date

# Load environment variables from .env file
env_path = Path(__file__).parent.parent / ".env"
load_dotenv(env_path)

# Alpaca API configuration
ALPACA_API_KEY = os.getenv("ALPACA_API_KEY", "")
ALPACA_SECRET_KEY = os.getenv("ALPACA_SECRET_KEY", "")
ALPACA_BASE_URL = os.getenv("ALPACA_BASE_URL", "https://api.alpaca.markets")

# Data paths
DATA_DIR = Path(__file__).parent.parent / "data"
EQUITY_DATA_PATH = os.getenv("EQUITY_DATA_PATH") or str(DATA_DIR / "equity_data.csv")

# Live trading entry date
_entry_date_str = os.getenv("LIVE_ENTRY_DATE", "2025-12-18")
try:
    LIVE_ENTRY_DATE = date.fromisoformat(_entry_date_str)
except ValueError:
    LIVE_ENTRY_DATE = date(2025, 12, 18)


def has_alpaca_credentials() -> bool:
    """Check if Alpaca API credentials are configured."""
    return bool(ALPACA_API_KEY and ALPACA_SECRET_KEY)
