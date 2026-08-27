import os
from dataclasses import dataclass

from dotenv import load_dotenv
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")


@dataclass(frozen=True)
class Settings:
    app_name: str = "Voltrex Terminal API"
    environment: str = os.getenv("VOLTREX_ENV", "development")
    mongodb_uri: str = os.getenv(
        "MONGODB_URI", "mongodb://localhost:27017/voltrex"
    )
    mongodb_db_name: str = os.getenv("MONGODB_DB_NAME", "voltrex")
    cors_origins: tuple[str, ...] = tuple(
        origin.strip()
        for origin in os.getenv(
            "VOLTREX_CORS_ORIGINS",
            "http://localhost:3000,http://127.0.0.1:3000",
        ).split(",")
        if origin.strip()
    )
    default_symbols: tuple[str, ...] = tuple(
        symbol.strip().upper()
        for symbol in os.getenv(
            "VOLTREX_DEFAULT_SYMBOLS",
            "ADANIENT,ADANIPORTS,APOLLOHOSP,ASIANPAINT,AXISBANK,"
            "BAJAJ-AUTO,BAJAJFINSV,BAJFINANCE,BHARTIARTL,BPCL,"
            "BRITANNIA,CIPLA,COALINDIA,DIVISLAB,DRREDDY,"
            "EICHERMOT,GRASIM,HCLTECH,HDFCBANK,HDFCLIFE,"
            "HEROMOTOCO,HINDALCO,HINDUNILVR,ICICIBANK,INDUSINDBK,"
            "INFY,ITC,JSWSTEEL,KOTAKBANK,LT,"
            "LTIM,M&M,MARUTI,NESTLEIND,NTPC,"
            "ONGC,POWERGRID,RELIANCE,SBILIFE,SBIN,"
            "SUNPHARMA,TATACONSUM,TATAMOTORS,TATASTEEL,TCS,"
            "TECHM,TITAN,ULTRACEMCO,ETERNAL,WIPRO",
        ).split(",")
        if symbol.strip()
    )


settings = Settings()
