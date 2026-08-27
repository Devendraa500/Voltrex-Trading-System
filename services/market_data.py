from datetime import datetime
from typing import Protocol

import pandas as pd


class MarketDataProvider(Protocol):
    def get_candles(
        self,
        symbol: str,
        interval: str,
        from_date: datetime,
        to_date: datetime,
    ) -> pd.DataFrame:
        ...


class ZerodhaMarketDataProvider:
    """Production market-data adapter backed by the existing Zerodha service."""

    def get_candles(
        self,
        symbol: str,
        interval: str,
        from_date: datetime,
        to_date: datetime,
    ) -> pd.DataFrame:
        from zerodha_data import get_stock_data

        frame = get_stock_data(
            symbol=symbol,
            interval=interval,
            from_date=from_date,
            to_date=to_date,
        )
        if frame is None:
            raise LookupError(f"Instrument token not found for {symbol}")
        return frame
