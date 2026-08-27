import unittest
from unittest.mock import patch
import httpx

from services.nifty50 import get_nifty50_symbols, _fetch_from_nse
from api.config import settings


class Nifty50Tests(unittest.TestCase):
    def test_live_fetch_success(self):
        # Test that a live fetch actually retrieves the Nifty 50 list and parses it
        symbols = get_nifty50_symbols(force_refresh=True)
        self.assertGreaterEqual(len(symbols), 45)  # Nifty 50 has 50 stocks
        self.assertIn("HDFCBANK", symbols)
        self.assertIn("RELIANCE", symbols)

    @patch("services.nifty50._fetch_from_nse")
    def test_fallback_on_failure(self, mock_fetch):
        # Test that we fall back to the hardcoded list when the fetch raises an exception
        mock_fetch.side_effect = httpx.RequestError("NSE is down")
        symbols = get_nifty50_symbols(force_refresh=True)
        self.assertEqual(symbols, list(settings.default_symbols))


if __name__ == "__main__":
    unittest.main()
