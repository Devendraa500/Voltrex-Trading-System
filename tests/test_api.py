import unittest
from unittest.mock import AsyncMock, patch

# Mock Database before importing app to avoid real MongoDB connections and event loop closed issues
database_patcher = patch("api.database.Database")
mock_db_class = database_patcher.start()
mock_db_instance = mock_db_class.return_value
mock_db_instance.initialize = AsyncMock()
mock_db_instance.list_watchlists = AsyncMock(return_value=[{"id": "dummy-id", "name": "Core Equities", "symbols": []}])
mock_db_instance.create_watchlist = AsyncMock()

from fastapi.testclient import TestClient
from api.main import app


class ApiTests(unittest.TestCase):
    @classmethod
    def tearDownClass(cls):
        database_patcher.stop()

    def test_health_and_engine_contract(self):
        with TestClient(app) as client:
            health = client.get("/api/v1/health")
            self.assertEqual(health.status_code, 200)
            self.assertEqual(health.json()["status"], "ok")

            levels = client.get("/api/v1/equilibrium/1085")
            self.assertEqual(levels.status_code, 200)
            self.assertEqual(levels.json()["tv"], 1088)

            levels = client.get("/api/v1/equilibrium/424.25")
            self.assertEqual(levels.status_code, 200)
            self.assertEqual(levels.json()["tv"], 420)

            levels = client.get("/api/v1/equilibrium/242.25")
            self.assertEqual(levels.status_code, 200)
            self.assertEqual(levels.json()["tv"], 240)

            levels = client.get("/api/v1/equilibrium/998")
            self.assertEqual(levels.status_code, 200)
            self.assertEqual(levels.json()["tv"], 1023)

            levels = client.get("/api/v1/equilibrium/1065.4")
            self.assertEqual(levels.status_code, 200)
            self.assertEqual(levels.json()["tv"], 1088)

    def test_instrument_lookup(self):
        with TestClient(app) as client:
            response = client.get("/api/v1/instruments/TATASTEEL")
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.json()["instrument_token"], 895745)

    def test_market_websocket_handshake(self):
        with TestClient(app) as client:
            with client.websocket_connect("/ws/market") as websocket:
                connected = websocket.receive_json()
                self.assertEqual(connected["type"], "terminal.connected")
                websocket.send_json({"type": "ping"})
                self.assertEqual(websocket.receive_json()["type"], "pong")


if __name__ == "__main__":
    unittest.main()
