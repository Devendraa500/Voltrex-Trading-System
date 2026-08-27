from dataclasses import asdict, dataclass
from datetime import datetime, timedelta
from typing import Any, Iterable
import time

import pandas as pd

from engines.equilibrium import calculate_equilibrium_levels
from indicators import (
    calculate_atr,
    calculate_ema,
    calculate_rsi,
    calculate_sma,
    calculate_volume_sma,
    generate_signal,
)
from market_regime import detect_market_regime
from services.market_data import MarketDataProvider


REQUIRED_COLUMNS = {"open", "high", "low", "close", "volume"}


@dataclass(frozen=True)
class ScanConfig:
    interval: str = "day"
    lookback_days: int = 450
    minimum_candles: int = 200
    account_size: float = 100000
    risk_per_trade: float = 0.01
    maximum_position_fraction: float = 0.20
    minimum_rr: float = 0.0
    minimum_volume_ratio: float = 0.0
    include_hold: bool = False


@dataclass(frozen=True)
class ScanResult:
    symbol: str
    timestamp: str
    signal: str
    technical_signal: str
    regime: str
    price: float
    change_percent: float
    volume: float
    volume_ratio: float
    rsi: float
    atr: float
    stop_loss: float
    target: float
    risk_reward: float
    quantity: int
    score: float
    grade: str
    equilibrium: dict[str, Any]

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass(frozen=True)
class ScanRun:
    results: list[ScanResult]
    errors: dict[str, str]
    quotes: dict[str, dict[str, float]] = None


class EquilibriumScanner:
    def __init__(
        self,
        market_data: MarketDataProvider,
        config: ScanConfig | None = None,
    ) -> None:
        self.market_data = market_data
        self.config = config or ScanConfig()

    def scan(
        self,
        symbols: Iterable[str],
        as_of: datetime | None = None,
    ) -> ScanRun:
        to_date = as_of or datetime.now()
        from_date = to_date - timedelta(days=self.config.lookback_days)
        results: list[ScanResult] = []
        errors: dict[str, str] = {}
        quotes: dict[str, dict[str, float]] = {}

        for raw_symbol in symbols:
            symbol = raw_symbol.strip().upper()
            if not symbol:
                continue
            try:
                time.sleep(0.35)  # Rate limit protection (max 3 req/sec)
                candles = self.market_data.get_candles(
                    symbol=symbol,
                    interval=self.config.interval,
                    from_date=from_date,
                    to_date=to_date,
                )
                if candles is not None and not candles.empty:
                    # Get the price and change_percent even if filtered by volume
                    try:
                        latest = candles.iloc[-1]
                        previous = candles.iloc[-2]
                        price = float(latest["close"])
                        prev_close = float(previous["close"])
                        change_percent = (
                            ((price - prev_close) / prev_close) * 100
                            if prev_close
                            else 0.0
                        )
                        quotes[symbol] = {
                            "price": round(price, 2),
                            "change_percent": round(change_percent, 2),
                        }
                    except Exception:
                        pass

                    col_map = {str(c).lower(): c for c in candles.columns}
                    vol_col = col_map.get("volume")
                    if vol_col:
                        latest_vol = float(candles.iloc[-1][vol_col])
                        if latest_vol < 10000000:
                            continue
                result = self.analyze(symbol, candles)
                if result.signal != "HOLD" or self.config.include_hold:
                    results.append(result)
            except Exception as exc:
                errors[symbol] = str(exc)

        results.sort(key=lambda item: item.score, reverse=True)
        return ScanRun(results=results, errors=errors, quotes=quotes)

    def analyze(self, symbol: str, candles: pd.DataFrame) -> ScanResult:
        frame = self._prepare_candles(candles)
        latest = frame.iloc[-1]
        previous = frame.iloc[-2]

        price = float(latest["close"])
        previous_close = float(previous["close"])
        change_percent = (
            ((price - previous_close) / previous_close) * 100
            if previous_close
            else 0.0
        )
        volume = float(latest["volume"])
        volume_sma = float(latest["VOLUME_SMA"])
        volume_ratio = volume / volume_sma if volume_sma else 0.0
        technical_signal = generate_signal(frame)
        regime = detect_market_regime(frame)
        equilibrium = calculate_equilibrium_levels(price)

        signal, stop_loss, target = self._select_setup(
            price=price,
            change_percent=change_percent,
            technical_signal=technical_signal,
            equilibrium=equilibrium,
        )
        risk = abs(price - stop_loss) if signal != "HOLD" else 0.0
        reward = abs(target - price) if signal != "HOLD" else 0.0
        risk_reward = reward / risk if risk else 0.0
        quantity = self._position_size(price=price, risk_per_share=risk)

        if (
            risk_reward < self.config.minimum_rr
            or volume_ratio < self.config.minimum_volume_ratio
            or quantity < 1
        ):
            signal = "HOLD"
            stop_loss = 0.0
            target = 0.0
            risk_reward = 0.0
            quantity = 0

        score = self._score(
            signal=signal,
            technical_signal=technical_signal,
            regime=regime,
            risk_reward=risk_reward,
            volume_ratio=volume_ratio,
            change_percent=change_percent,
        )

        timestamp = latest.get("date", latest.name)
        if hasattr(timestamp, "isoformat"):
            timestamp = timestamp.isoformat()

        return ScanResult(
            symbol=symbol.upper(),
            timestamp=str(timestamp),
            signal=signal,
            technical_signal=technical_signal,
            regime=regime,
            price=round(price, 2),
            change_percent=round(change_percent, 2),
            volume=round(volume, 2),
            volume_ratio=round(volume_ratio, 2),
            rsi=round(float(latest["RSI"]), 2),
            atr=round(float(latest["ATR"]), 2),
            stop_loss=round(stop_loss, 2),
            target=round(target, 2),
            risk_reward=round(risk_reward, 2),
            quantity=quantity,
            score=round(score, 2),
            grade=self._grade(score),
            equilibrium=equilibrium,
        )

    def _prepare_candles(self, candles: pd.DataFrame) -> pd.DataFrame:
        if candles is None or candles.empty:
            raise ValueError("No candle data returned")

        frame = candles.copy()
        frame.columns = [str(column).lower() for column in frame.columns]
        missing = REQUIRED_COLUMNS.difference(frame.columns)
        if missing:
            raise ValueError(
                f"Missing required candle columns: {', '.join(sorted(missing))}"
            )

        for column in REQUIRED_COLUMNS:
            frame[column] = pd.to_numeric(frame[column], errors="coerce")
        frame = frame.dropna(subset=list(REQUIRED_COLUMNS)).reset_index(drop=True)

        if len(frame) < self.config.minimum_candles:
            raise ValueError(
                f"Need at least {self.config.minimum_candles} candles; "
                f"received {len(frame)}"
            )

        frame = calculate_sma(frame, 20)
        frame = calculate_sma(frame, 50)
        frame = calculate_sma(frame, 200)
        frame = calculate_ema(frame, 20)
        frame = calculate_rsi(frame)
        frame = calculate_atr(frame)
        frame = calculate_volume_sma(frame)

        latest_indicators = frame.iloc[-1][
            ["SMA_20", "SMA_50", "SMA_200", "RSI", "ATR", "VOLUME_SMA"]
        ]
        if latest_indicators.isna().any():
            raise ValueError("Latest candle has incomplete indicator data")
        return frame

    @staticmethod
    def _select_setup(
        price: float,
        change_percent: float,
        technical_signal: str,
        equilibrium: dict[str, Any],
    ) -> tuple[str, float, float]:
        buy_stop = float(equilibrium["sl_price"])
        buy_target = float(equilibrium["qr1"])
        sell_stop = float(equilibrium["qr1"])
        sell_target = float(equilibrium["qs1"])

        if (
            buy_stop < price < buy_target
            and change_percent > 0
            and technical_signal != "SELL"
        ):
            return "BUY", buy_stop, buy_target
        if (
            sell_target < price < sell_stop
            and change_percent < 0
            and technical_signal != "BUY"
        ):
            return "SELL", sell_stop, sell_target
        return "HOLD", 0.0, 0.0

    def _position_size(self, price: float, risk_per_share: float) -> int:
        if risk_per_share <= 0:
            return 0

        risk_budget = self.config.account_size * self.config.risk_per_trade
        risk_quantity = int(risk_budget / risk_per_share)
        position_cap = (
            self.config.account_size * self.config.maximum_position_fraction
        )
        value_quantity = int(position_cap / price) if price else 0
        return max(0, min(risk_quantity, value_quantity))

    @staticmethod
    def _score(
        signal: str,
        technical_signal: str,
        regime: str,
        risk_reward: float,
        volume_ratio: float,
        change_percent: float,
    ) -> float:
        if signal == "HOLD":
            return 0.0

        score = min(risk_reward, 5.0) * 10
        score += min(max(volume_ratio - 1.0, 0.0), 2.0) * 10
        score += min(abs(change_percent), 5.0) * 2
        if signal == technical_signal:
            score += 15
        if (signal == "BUY" and regime == "BULL") or (
            signal == "SELL" and regime == "BEAR"
        ):
            score += 15
        return min(score, 100.0)

    @staticmethod
    def _grade(score: float) -> str:
        if score >= 75:
            return "A"
        if score >= 60:
            return "B"
        if score >= 40:
            return "C"
        return "D"
