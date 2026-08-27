"""Fetch live Nifty 50 constituents from NSE.

The module caches the result for 24 hours so that repeated scans within a
day don't hammer the NSE endpoint.  If the live fetch fails for any reason,
it falls back to the hardcoded list in ``api.config.Settings.default_symbols``.
"""

from __future__ import annotations

import csv
import io
import logging
import time

import httpx

from api.config import settings

logger = logging.getLogger(__name__)

# ── Cache ────────────────────────────────────────────────────────────────
_cached_symbols: list[str] = []
_cache_ts: float = 0.0
_CACHE_TTL_SECONDS: float = 24 * 60 * 60  # 24 hours

_NSE_CSV_URL = "https://archives.nseindia.com/content/indices/ind_nifty50list.csv"
_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/131.0.0.0 Safari/537.36"
    ),
    "Accept": "*/*",
    "Accept-Language": "en-US,en;q=0.9",
}


def _fetch_from_nse() -> list[str]:
    """Download the official Nifty 50 constituents CSV from NSE archives.

    The CSV has columns: Company Name, Industry, Symbol, Series, ISIN Code.
    We extract the 'Symbol' column.
    """
    with httpx.Client(
        headers=_HEADERS,
        follow_redirects=True,
        timeout=15.0,
    ) as client:
        resp = client.get(_NSE_CSV_URL)
        resp.raise_for_status()

    reader = csv.DictReader(io.StringIO(resp.text))
    symbols: list[str] = []
    for row in reader:
        sym = row.get("Symbol", "").strip().upper()
        if sym:
            symbols.append(sym)

    return symbols


def get_nifty50_symbols(*, force_refresh: bool = False) -> list[str]:
    """Return the current Nifty 50 constituent symbols.

    Uses a 24-hour cache.  Falls back to the hardcoded list in
    ``settings.default_symbols`` if the live fetch fails.

    Parameters
    ----------
    force_refresh : bool
        If ``True``, bypass the cache and fetch from NSE again.
    """
    global _cached_symbols, _cache_ts

    now = time.time()

    # Return cached value if still fresh
    if not force_refresh and _cached_symbols and (now - _cache_ts) < _CACHE_TTL_SECONDS:
        logger.info("Using cached Nifty 50 list (%d symbols)", len(_cached_symbols))
        return list(_cached_symbols)

    # Attempt live fetch
    try:
        symbols = _fetch_from_nse()
        if symbols:
            _cached_symbols = symbols
            _cache_ts = now
            logger.info(
                "Fetched live Nifty 50 list from NSE: %d symbols", len(symbols)
            )
            return list(symbols)
        else:
            logger.warning("NSE returned an empty symbol list, using fallback")
    except Exception:
        logger.exception("Failed to fetch Nifty 50 from NSE, using fallback")

    # Fallback to hardcoded list
    fallback = list(settings.default_symbols)
    logger.info("Using hardcoded fallback Nifty 50 list (%d symbols)", len(fallback))
    return fallback
