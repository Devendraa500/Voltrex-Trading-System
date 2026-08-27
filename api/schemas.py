from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator


class HealthResponse(BaseModel):
    status: str
    service: str
    environment: str
    database: str
    zerodha_configured: bool


class ScanRequest(BaseModel):
    symbols: list[str] = Field(default_factory=list, max_length=100)
    interval: str = "day"
    lookback_days: int = Field(default=450, ge=200, le=2000)
    account_size: float = Field(default=100000, gt=0)
    risk_per_trade: float = Field(default=0.01, gt=0, le=0.10)
    maximum_position_fraction: float = Field(default=0.20, gt=0, le=1)
    minimum_rr: float = Field(default=1.0, ge=0, le=20)
    minimum_volume_ratio: float = Field(default=0.0, ge=0, le=20)
    include_hold: bool = True

    @field_validator("symbols")
    @classmethod
    def normalize_symbols(cls, symbols: list[str]) -> list[str]:
        return list(
            dict.fromkeys(
                symbol.strip().upper()
                for symbol in symbols
                if symbol.strip()
            )
        )


class WatchlistInput(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    symbols: list[str] = Field(default_factory=list, max_length=200)

    @field_validator("symbols")
    @classmethod
    def normalize_symbols(cls, symbols: list[str]) -> list[str]:
        return list(
            dict.fromkeys(
                symbol.strip().upper()
                for symbol in symbols
                if symbol.strip()
            )
        )


class Watchlist(WatchlistInput):
    id: str
    user_id: str
    created_at: datetime


class AlertInput(BaseModel):
    symbol: str
    condition: Literal["ABOVE", "BELOW", "SIGNAL_BUY", "SIGNAL_SELL"]
    threshold: float = Field(default=0, ge=0)

    @field_validator("symbol")
    @classmethod
    def normalize_symbol(cls, symbol: str) -> str:
        return symbol.strip().upper()


class Alert(AlertInput):
    id: str
    user_id: str
    active: bool
    created_at: datetime
    triggered_at: datetime | None = None


class AlertState(BaseModel):
    active: bool


class TradeInput(BaseModel):
    symbol: str
    side: Literal["BUY", "SELL"]
    entry_price: float = Field(gt=0)
    stop_loss: float = Field(gt=0)
    target: float = Field(gt=0)
    quantity: int = Field(gt=0)
    notes: str = Field(default="", max_length=2000)

    @field_validator("symbol")
    @classmethod
    def normalize_symbol(cls, symbol: str) -> str:
        return symbol.strip().upper()


class TradeClose(BaseModel):
    exit_price: float = Field(gt=0)
    notes: str | None = Field(default=None, max_length=2000)


class Trade(BaseModel):
    id: str
    user_id: str
    symbol: str
    side: str
    status: str
    entry_price: float
    exit_price: float | None
    stop_loss: float
    target: float
    quantity: int
    opened_at: datetime
    closed_at: datetime | None
    notes: str


class ExplanationRequest(BaseModel):
    scan_result: dict


# ── Auth schemas ─────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    email: str = Field(min_length=5, max_length=200)
    password: str = Field(min_length=6, max_length=200)
    confirm_password: str

    @field_validator("email")
    @classmethod
    def normalize_email(cls, email: str) -> str:
        return email.strip().lower()

    @field_validator("confirm_password")
    @classmethod
    def passwords_match(cls, confirm: str, info) -> str:
        if "password" in info.data and confirm != info.data["password"]:
            raise ValueError("Passwords do not match")
        return confirm


class LoginRequest(BaseModel):
    email: str = Field(min_length=1)
    password: str = Field(min_length=1)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, email: str) -> str:
        return email.strip().lower()


class UserProfile(BaseModel):
    id: str
    name: str
    email: str
    trader_id: str
    account_tier: str
    created_at: str


class AuthResponse(BaseModel):
    token: str
    user: UserProfile
