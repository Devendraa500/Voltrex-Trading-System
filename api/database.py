from datetime import datetime, timezone
from typing import Any

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo.errors import DuplicateKeyError


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _id_to_str(doc: dict[str, Any] | None) -> dict[str, Any] | None:
    """Convert MongoDB _id (ObjectId) to a string 'id' field."""
    if doc is None:
        return None
    doc["id"] = str(doc.pop("_id"))
    return doc


class Database:
    def __init__(self, uri: str, db_name: str = "voltrex") -> None:
        self.client: AsyncIOMotorClient = AsyncIOMotorClient(uri)
        self.db: AsyncIOMotorDatabase = self.client[db_name]

    async def initialize(self) -> None:
        """Create indexes for all collections."""
        await self.db.users.create_index("email", unique=True)
        await self.db.users.create_index("trader_id", unique=True)
        await self.db.watchlists.create_index(
            [("user_id", 1), ("name", 1)], unique=True
        )
        await self.db.alerts.create_index("user_id")
        await self.db.trades.create_index("user_id")

    # ── Watchlists ───────────────────────────────────────────────────────────

    async def create_watchlist(
        self,
        name: str,
        user_id: str,
        symbols: list[str],
    ) -> dict[str, Any]:
        doc = {
            "user_id": user_id,
            "name": name,
            "symbols": self._normalize_symbols(symbols),
            "created_at": utc_now(),
        }
        result = await self.db.watchlists.insert_one(doc)
        return await self.get_watchlist(str(result.inserted_id), user_id)

    async def list_watchlists(self, user_id: str) -> list[dict[str, Any]]:
        cursor = self.db.watchlists.find({"user_id": user_id}).sort("name", 1)
        return [_id_to_str(doc) async for doc in cursor]

    async def get_watchlist(
        self,
        watchlist_id: str,
        user_id: str,
    ) -> dict[str, Any] | None:
        doc = await self.db.watchlists.find_one(
            {"_id": ObjectId(watchlist_id), "user_id": user_id}
        )
        return _id_to_str(doc)

    async def update_watchlist(
        self,
        watchlist_id: str,
        user_id: str,
        name: str,
        symbols: list[str],
    ) -> dict[str, Any] | None:
        result = await self.db.watchlists.update_one(
            {"_id": ObjectId(watchlist_id), "user_id": user_id},
            {"$set": {
                "name": name,
                "symbols": self._normalize_symbols(symbols),
            }},
        )
        if not result.matched_count:
            return None
        return await self.get_watchlist(watchlist_id, user_id)

    async def delete_watchlist(self, watchlist_id: str, user_id: str) -> bool:
        result = await self.db.watchlists.delete_one(
            {"_id": ObjectId(watchlist_id), "user_id": user_id}
        )
        return bool(result.deleted_count)

    # ── Alerts ───────────────────────────────────────────────────────────────

    async def create_alert(
        self,
        user_id: str,
        symbol: str,
        condition: str,
        threshold: float,
    ) -> dict[str, Any]:
        doc = {
            "user_id": user_id,
            "symbol": symbol,
            "condition": condition,
            "threshold": threshold,
            "active": True,
            "created_at": utc_now(),
            "triggered_at": None,
        }
        result = await self.db.alerts.insert_one(doc)
        return await self.get_alert(str(result.inserted_id), user_id)

    async def get_alert(
        self, alert_id: str, user_id: str
    ) -> dict[str, Any] | None:
        doc = await self.db.alerts.find_one(
            {"_id": ObjectId(alert_id), "user_id": user_id}
        )
        return _id_to_str(doc)

    async def list_alerts(self, user_id: str) -> list[dict[str, Any]]:
        cursor = self.db.alerts.find({"user_id": user_id}).sort("_id", -1)
        return [_id_to_str(doc) async for doc in cursor]

    async def update_alert_state(
        self,
        alert_id: str,
        user_id: str,
        active: bool,
    ) -> dict[str, Any] | None:
        result = await self.db.alerts.update_one(
            {"_id": ObjectId(alert_id), "user_id": user_id},
            {"$set": {"active": active}},
        )
        if not result.matched_count:
            return None
        return await self.get_alert(alert_id, user_id)

    async def delete_alert(self, alert_id: str, user_id: str) -> bool:
        result = await self.db.alerts.delete_one(
            {"_id": ObjectId(alert_id), "user_id": user_id}
        )
        return bool(result.deleted_count)

    # ── Scan runs ────────────────────────────────────────────────────────────

    async def save_scan_run(
        self,
        symbols: list[str],
        config: dict[str, Any],
        results: list[dict[str, Any]],
        errors: dict[str, str],
        quotes: dict[str, dict[str, float]] | None = None,
    ) -> str:
        doc = {
            "created_at": utc_now(),
            "symbols": symbols,
            "config": config,
            "results": results,
            "errors": errors,
            "quotes": quotes or {},
        }
        result = await self.db.scan_runs.insert_one(doc)
        return str(result.inserted_id)

    async def latest_scan(self) -> dict[str, Any] | None:
        doc = await self.db.scan_runs.find_one(
            sort=[("_id", -1)]
        )
        if not doc:
            return None
        return {
            "run_id": str(doc["_id"]),
            "created_at": doc["created_at"],
            "symbols": doc["symbols"],
            "config": doc["config"],
            "errors": doc["errors"],
            "results": sorted(
                doc.get("results", []),
                key=lambda r: r.get("score", 0),
                reverse=True,
            ),
            "quotes": doc.get("quotes", {}),
        }

    # ── Trades ───────────────────────────────────────────────────────────────

    async def create_trade(self, trade: dict[str, Any]) -> dict[str, Any]:
        doc = {
            "user_id": trade["user_id"],
            "symbol": trade["symbol"],
            "side": trade["side"],
            "status": trade.get("status", "OPEN"),
            "entry_price": trade["entry_price"],
            "exit_price": trade.get("exit_price"),
            "stop_loss": trade["stop_loss"],
            "target": trade["target"],
            "quantity": trade["quantity"],
            "opened_at": trade.get("opened_at") or utc_now(),
            "closed_at": trade.get("closed_at"),
            "notes": trade.get("notes", ""),
        }
        result = await self.db.trades.insert_one(doc)
        return await self.get_trade(str(result.inserted_id), trade["user_id"])

    async def get_trade(
        self, trade_id: str, user_id: str
    ) -> dict[str, Any] | None:
        doc = await self.db.trades.find_one(
            {"_id": ObjectId(trade_id), "user_id": user_id}
        )
        return _id_to_str(doc)

    async def list_trades(self, user_id: str) -> list[dict[str, Any]]:
        cursor = self.db.trades.find({"user_id": user_id}).sort("_id", -1)
        return [_id_to_str(doc) async for doc in cursor]

    async def close_trade(
        self,
        trade_id: str,
        user_id: str,
        exit_price: float,
        notes: str | None,
    ) -> dict[str, Any] | None:
        update: dict[str, Any] = {
            "status": "CLOSED",
            "exit_price": exit_price,
            "closed_at": utc_now(),
        }
        if notes is not None:
            update["notes"] = notes
        result = await self.db.trades.update_one(
            {"_id": ObjectId(trade_id), "user_id": user_id},
            {"$set": update},
        )
        if not result.matched_count:
            return None
        return await self.get_trade(trade_id, user_id)

    async def delete_trade(self, trade_id: str, user_id: str) -> bool:
        result = await self.db.trades.delete_one(
            {"_id": ObjectId(trade_id), "user_id": user_id}
        )
        return bool(result.deleted_count)

    # ── Users ────────────────────────────────────────────────────────────────

    async def create_user(
        self,
        name: str,
        email: str,
        password_hash: str,
    ) -> dict[str, Any]:
        doc = {
            "name": name.strip(),
            "email": email.strip().lower(),
            "password_hash": password_hash,
            "trader_id": "",  # will be set after insert
            "account_tier": "PROFESSIONAL",
            "created_at": utc_now(),
        }
        result = await self.db.users.insert_one(doc)
        user_id = result.inserted_id
        # Generate trader_id from the ObjectId's counter (last 6 hex chars)
        trader_id = f"VTZ-{str(user_id)[-6:].upper()}"
        await self.db.users.update_one(
            {"_id": user_id},
            {"$set": {"trader_id": trader_id}},
        )
        return await self.get_user_by_id(str(user_id))

    async def get_user_by_email(self, email: str) -> dict[str, Any] | None:
        doc = await self.db.users.find_one(
            {"email": email.strip().lower()}
        )
        return self._user_dict(doc)

    async def get_user_by_id(self, user_id: str) -> dict[str, Any] | None:
        doc = await self.db.users.find_one({"_id": ObjectId(user_id)})
        return self._user_dict(doc)

    async def get_user_with_hash(self, email: str) -> dict[str, Any] | None:
        """Return user document WITH password_hash for login verification."""
        doc = await self.db.users.find_one(
            {"email": email.strip().lower()}
        )
        if doc is None:
            return None
        doc["id"] = str(doc.pop("_id"))
        return doc

    # ── Helpers ──────────────────────────────────────────────────────────────

    @staticmethod
    def _user_dict(doc: dict[str, Any] | None) -> dict[str, Any] | None:
        if doc is None:
            return None
        doc["id"] = str(doc.pop("_id"))
        doc.pop("password_hash", None)
        return doc

    @staticmethod
    def _normalize_symbols(symbols: list[str]) -> list[str]:
        return list(
            dict.fromkeys(
                s.strip().upper() for s in symbols if s.strip()
            )
        )
