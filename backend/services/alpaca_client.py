"""Alpaca API client service."""

from datetime import datetime
from typing import Optional
import alpaca_trade_api as tradeapi

from .config import ALPACA_API_KEY, ALPACA_SECRET_KEY, ALPACA_BASE_URL, has_alpaca_credentials


class AlpacaClient:
    """Client for interacting with Alpaca Trading API."""

    def __init__(self):
        if not has_alpaca_credentials():
            raise ValueError("Alpaca API credentials not configured")
        self.api = tradeapi.REST(ALPACA_API_KEY, ALPACA_SECRET_KEY, ALPACA_BASE_URL)

    def get_account(self) -> dict:
        """Get account information."""
        account = self.api.get_account()
        return {
            "account_id": account.id,
            "cash": float(account.cash),
            "portfolio_value": float(account.portfolio_value),
            "buying_power": float(account.buying_power),
            "equity": float(account.equity),
            "last_equity": float(account.last_equity),
            "status": account.status,
        }

    def get_portfolio_history(
        self,
        period: str = "all",
        timeframe: str = "1D",
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> dict:
        """
        Get portfolio history.

        Args:
            period: "1D", "1W", "1M", "3M", "1A", "all"
            timeframe: "1Min", "5Min", "15Min", "1H", "1D"
            start_date: Optional start date
            end_date: Optional end date

        Returns:
            dict with timestamps, equity, profit_loss, profit_loss_pct
        """
        kwargs = {"period": period, "timeframe": timeframe}
        if start_date:
            kwargs["date_start"] = start_date.strftime("%Y-%m-%d")
        if end_date:
            kwargs["date_end"] = end_date.strftime("%Y-%m-%d")

        history = self.api.get_portfolio_history(**kwargs)

        return {
            "timestamps": list(history.timestamp),
            "equity": list(history.equity),
            "profit_loss": list(history.profit_loss),
            "profit_loss_pct": list(history.profit_loss_pct),
        }

    def get_positions(self) -> list[dict]:
        """Get current positions."""
        positions = self.api.list_positions()
        return [
            {
                "symbol": p.symbol,
                "qty": float(p.qty),
                "avg_entry_price": float(p.avg_entry_price),
                "current_price": float(p.current_price),
                "market_value": float(p.market_value),
                "unrealized_pl": float(p.unrealized_pl),
                "unrealized_plpc": float(p.unrealized_plpc),
            }
            for p in positions
        ]


# Singleton instance
_client: Optional[AlpacaClient] = None


def get_alpaca_client() -> AlpacaClient:
    """Get or create Alpaca client singleton."""
    global _client
    if _client is None:
        _client = AlpacaClient()
    return _client
