import unittest

from unittest.mock import AsyncMock, patch
from api.database import Database
from services.analytics import portfolio_analytics


class DatabaseTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        # Use a unique test database name to avoid conflicts
        self.database = Database(
            "mongodb://localhost:27017", "voltrex_test_ephemeral"
        )
        try:
            await self.database.initialize()
            # Clean all collections before each test
            for name in await self.database.db.list_collection_names():
                await self.database.db[name].drop()
        except Exception:
            self.skipTest("MongoDB not available locally — skipping database tests")

    async def asyncTearDown(self):
        try:
            await self.database.client.drop_database("voltrex_test_ephemeral")
        except Exception:
            pass

    async def test_watchlist_lifecycle(self):
        created = await self.database.create_watchlist(
            "Momentum",
            "test-user",
            ["reliance", "INFY", "INFY"],
        )
        self.assertIsInstance(created["id"], str)
        self.assertEqual(created["symbols"], ["RELIANCE", "INFY"])

        updated = await self.database.update_watchlist(
            created["id"],
            "test-user",
            "Core",
            ["SBIN"],
        )
        self.assertEqual(updated["name"], "Core")
        self.assertEqual(updated["symbols"], ["SBIN"])
        self.assertTrue(
            await self.database.delete_watchlist(created["id"], "test-user")
        )

    async def test_trade_analytics(self):
        trade = await self.database.create_trade(
            {
                "user_id": "test-user",
                "symbol": "TATASTEEL",
                "side": "BUY",
                "entry_price": 200,
                "stop_loss": 190,
                "target": 220,
                "quantity": 10,
                "notes": "test",
            }
        )
        self.assertIsInstance(trade["id"], str)
        await self.database.close_trade(
            trade["id"],
            "test-user",
            exit_price=220,
            notes=None,
        )
        trades = await self.database.list_trades("test-user")
        analytics = portfolio_analytics(trades)
        self.assertEqual(analytics["total_pnl"], 200)
        self.assertEqual(analytics["win_rate"], 100)


if __name__ == "__main__":
    unittest.main()
