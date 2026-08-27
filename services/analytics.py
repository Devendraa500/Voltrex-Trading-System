from typing import Any
import math


def calculate_trade_pnl(trade: dict[str, Any]) -> float | None:
    if trade["status"] != "CLOSED" or trade["exit_price"] is None:
        return None
    direction = 1 if trade["side"] == "BUY" else -1
    return (
        (trade["exit_price"] - trade["entry_price"])
        * trade["quantity"]
        * direction
    )


def _sharpe_ratio(pnls: list[float], periods_per_year: int = 252) -> float | None:
    """Annualised Sharpe ratio (risk-free rate = 0).

    Requires at least 2 closed trades to produce a meaningful result.
    """
    if len(pnls) < 2:
        return None
    n = len(pnls)
    mean = sum(pnls) / n
    variance = sum((p - mean) ** 2 for p in pnls) / (n - 1)
    std = math.sqrt(variance)
    if std == 0:
        return None
    # Scale to annualised: multiply per-trade Sharpe by sqrt(trades per year)
    # We approximate trades per year as `periods_per_year / 1` since we don't
    # have exact holding periods here. Conservative daily-trade assumption.
    return round(mean / std * math.sqrt(periods_per_year), 2)


def _consecutive_streaks(pnls: list[float]) -> tuple[int, int]:
    """Return (max_consecutive_wins, max_consecutive_losses)."""
    if not pnls:
        return 0, 0
    max_wins = max_losses = cur_wins = cur_losses = 0
    for pnl in pnls:
        if pnl > 0:
            cur_wins += 1
            cur_losses = 0
        elif pnl < 0:
            cur_losses += 1
            cur_wins = 0
        max_wins = max(max_wins, cur_wins)
        max_losses = max(max_losses, cur_losses)
    return max_wins, max_losses


def _per_symbol_stats(closed: list[dict[str, Any]]) -> dict[str, Any]:
    """Aggregate closed-trade P&L and win rate per symbol."""
    grouped: dict[str, list[float]] = {}
    for trade in closed:
        sym = trade.get("symbol", "UNKNOWN")
        grouped.setdefault(sym, []).append(trade["pnl"])
    result = {}
    for sym, pnls in grouped.items():
        wins = [p for p in pnls if p > 0]
        result[sym] = {
            "trades": len(pnls),
            "wins": len(wins),
            "win_rate": round(len(wins) / len(pnls) * 100, 2),
            "total_pnl": round(sum(pnls), 2),
        }
    return result


def portfolio_analytics(trades: list[dict[str, Any]]) -> dict[str, Any]:
    closed: list[dict[str, Any]] = []
    open_trades: list[dict[str, Any]] = []

    for trade in trades:
        pnl = calculate_trade_pnl(trade)
        enriched = {**trade, "pnl": round(pnl, 2) if pnl is not None else None}
        if pnl is None:
            open_trades.append(enriched)
        else:
            closed.append(enriched)

    pnls = [trade["pnl"] for trade in closed]
    winners = [pnl for pnl in pnls if pnl > 0]
    losers  = [pnl for pnl in pnls if pnl < 0]

    total_pnl    = sum(pnls)
    win_rate     = len(winners) / len(closed) * 100 if closed else 0
    average_win  = sum(winners) / len(winners) if winners else 0
    average_loss = sum(losers)  / len(losers)  if losers  else 0
    expectancy   = (
        (win_rate / 100 * average_win)
        + ((1 - win_rate / 100) * average_loss)
        if closed else 0
    )
    profit_factor = (
        sum(winners) / abs(sum(losers))
        if losers
        else (float("inf") if winners else 0)
    )

    # ── Equity curve + drawdown ───────────────────────────────
    equity = 0.0
    peak = 0.0
    max_drawdown = 0.0
    equity_curve: list[float] = []
    for trade in reversed(closed):
        equity += trade["pnl"]
        peak = max(peak, equity)
        max_drawdown = max(max_drawdown, peak - equity)
        equity_curve.append(round(equity, 2))

    # ── Streak analysis ───────────────────────────────────────
    max_wins, max_losses = _consecutive_streaks(pnls)

    # ── Per-symbol breakdown ──────────────────────────────────
    by_symbol = _per_symbol_stats(closed)

    # ── Sharpe ratio ──────────────────────────────────────────
    sharpe = _sharpe_ratio(pnls)

    # ── Average trade duration (days) ─────────────────────────
    durations: list[float] = []
    for trade in closed:
        opened = trade.get("opened_at")
        closed_at = trade.get("closed_at")
        if opened and closed_at:
            try:
                from datetime import datetime, timezone
                fmt = "%Y-%m-%dT%H:%M:%S.%f+00:00"
                # Handle both fractional-seconds and plain ISO formats
                def _parse(ts: str):
                    for fmt in (
                        "%Y-%m-%dT%H:%M:%S.%f+00:00",
                        "%Y-%m-%dT%H:%M:%S+00:00",
                        "%Y-%m-%dT%H:%M:%S.%fZ",
                        "%Y-%m-%dT%H:%M:%SZ",
                    ):
                        try:
                            return datetime.strptime(ts, fmt).replace(tzinfo=timezone.utc)
                        except ValueError:
                            continue
                    return None
                t_open = _parse(opened)
                t_close = _parse(closed_at)
                if t_open and t_close:
                    durations.append((t_close - t_open).days)
            except Exception:
                pass

    avg_duration = round(sum(durations) / len(durations), 1) if durations else None

    return {
        "total_trades":    len(trades),
        "open_trades":     len(open_trades),
        "closed_trades":   len(closed),
        "wins":            len(winners),
        "losses":          len(losers),
        "win_rate":        round(win_rate, 2),
        "total_pnl":       round(total_pnl, 2),
        "average_win":     round(average_win, 2),
        "average_loss":    round(average_loss, 2),
        "expectancy":      round(expectancy, 2),
        "profit_factor":   (
            None if profit_factor == float("inf")
            else round(profit_factor, 2)
        ),
        "max_drawdown":    round(max_drawdown, 2),
        "sharpe_ratio":    sharpe,
        "max_consecutive_wins":   max_wins,
        "max_consecutive_losses": max_losses,
        "avg_trade_duration_days": avg_duration,
        "by_symbol":       by_symbol,
        "equity_curve":    equity_curve,
        "trades":          closed + open_trades,
    }
