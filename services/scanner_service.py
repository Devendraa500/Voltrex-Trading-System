import asyncio
from dataclasses import asdict
from datetime import datetime
from typing import Any

from api.database import Database
from scanners.equilibrium_scanner import EquilibriumScanner, ScanConfig
from services.alert_engine import evaluate_alerts
from services.market_data import MarketDataProvider
from services.websocket_hub import WebSocketHub


class ScannerService:
    def __init__(
        self,
        market_data: MarketDataProvider,
        database: Database,
        hub: WebSocketHub,
    ) -> None:
        self.market_data = market_data
        self.database = database
        self.hub = hub

    async def run(
        self,
        symbols: list[str],
        config: ScanConfig,
        user_id: str,
    ) -> dict[str, Any]:
        scanner = EquilibriumScanner(self.market_data, config)
        scan_run = await asyncio.to_thread(scanner.scan, symbols, datetime.now())
        results = [result.to_dict() for result in scan_run.results]
        config_data = asdict(config)
        run_id = await self.database.save_scan_run(
            symbols,
            config_data,
            results,
            scan_run.errors,
            scan_run.quotes,
        )
        alerts = await self.database.list_alerts(user_id)
        triggered = evaluate_alerts(alerts, results)
        payload = {
            "run_id": run_id,
            "created_at": datetime.now().astimezone().isoformat(),
            "symbols": symbols,
            "config": config_data,
            "results": results,
            "errors": scan_run.errors,
            "quotes": scan_run.quotes,
            "triggered_alerts": triggered,
        }
        await self.hub.broadcast({"type": "scan.completed", "data": payload})
        for alert in triggered:
            await self.hub.broadcast({"type": "alert.triggered", "data": alert})
        return payload
