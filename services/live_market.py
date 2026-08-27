import asyncio
import os
from threading import Lock
from typing import Any

from dotenv import load_dotenv
from kiteconnect import KiteTicker

from instrument_lookup import get_instrument_token
from services.websocket_hub import WebSocketHub


class ZerodhaLiveMarketService:
    """KiteTicker adapter that publishes normalized ticks to the API hub."""

    def __init__(self, hub: WebSocketHub) -> None:
        self.hub = hub
        self._ticker: KiteTicker | None = None
        self._tokens: list[int] = []
        self._symbols_by_token: dict[int, str] = {}
        self._loop: asyncio.AbstractEventLoop | None = None
        self._connected = False
        self._lock = Lock()
        self._last_error: str | None = None

    def status(self) -> dict[str, Any]:
        with self._lock:
            return {
                "connected": self._connected,
                "subscribed_symbols": list(self._symbols_by_token.values()),
                "last_error": self._last_error,
            }

    async def start(self, symbols: list[str]) -> dict[str, Any]:
        load_dotenv()
        api_key = os.getenv("ZERODHA_API_KEY")
        access_token = os.getenv("ZERODHA_ACCESS_TOKEN")
        if not api_key or not access_token:
            raise RuntimeError(
                "ZERODHA_API_KEY and ZERODHA_ACCESS_TOKEN are required"
            )

        normalized = list(
            dict.fromkeys(symbol.strip().upper() for symbol in symbols if symbol)
        )
        token_map = {
            token: symbol
            for symbol in normalized
            if (token := get_instrument_token(symbol)) is not None
        }
        if not token_map:
            raise ValueError("No valid NSE equity symbols were supplied")

        await self.stop()
        self._loop = asyncio.get_running_loop()
        self._tokens = list(token_map)
        self._symbols_by_token = token_map
        self._last_error = None
        ticker = KiteTicker(api_key, access_token)
        self._ticker = ticker

        def on_connect(ws, response):
            with self._lock:
                self._connected = True
            ws.subscribe(self._tokens)
            ws.set_mode(ws.MODE_FULL, self._tokens)
            self._publish(
                {
                    "type": "market.connected",
                    "data": {"symbols": list(token_map.values())},
                }
            )

        def on_ticks(ws, ticks):
            normalized_ticks = [
                {
                    **tick,
                    "symbol": self._symbols_by_token.get(
                        tick.get("instrument_token"),
                        str(tick.get("instrument_token")),
                    ),
                    "timestamp": str(
                        tick.get("exchange_timestamp")
                        or tick.get("timestamp")
                        or ""
                    ),
                }
                for tick in ticks
            ]
            self._publish({"type": "market.ticks", "data": normalized_ticks})

        def on_close(ws, code, reason):
            with self._lock:
                self._connected = False
            self._publish(
                {
                    "type": "market.disconnected",
                    "data": {"code": code, "reason": reason},
                }
            )

        def on_error(ws, code, reason):
            with self._lock:
                self._last_error = f"{code}: {reason}"
            self._publish(
                {
                    "type": "market.error",
                    "data": {"code": code, "reason": reason},
                }
            )

        ticker.on_connect = on_connect
        ticker.on_ticks = on_ticks
        ticker.on_close = on_close
        ticker.on_error = on_error
        ticker.connect(threaded=True)
        return self.status()

    async def stop(self) -> dict[str, Any]:
        ticker = self._ticker
        if ticker is not None:
            await asyncio.to_thread(ticker.close)
        with self._lock:
            self._connected = False
        self._ticker = None
        self._tokens = []
        self._symbols_by_token = {}
        return self.status()

    def _publish(self, event: dict[str, Any]) -> None:
        if self._loop and self._loop.is_running():
            asyncio.run_coroutine_threadsafe(
                self.hub.broadcast(event),
                self._loop,
            )
