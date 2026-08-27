from typing import Any


def evaluate_alerts(
    alerts: list[dict[str, Any]],
    scan_results: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    by_symbol = {item["symbol"]: item for item in scan_results}
    triggered = []
    for alert in alerts:
        if not alert["active"] or alert["symbol"] not in by_symbol:
            continue
        result = by_symbol[alert["symbol"]]
        condition = alert["condition"]
        price = float(result["price"])
        is_triggered = (
            (condition == "ABOVE" and price >= alert["threshold"])
            or (condition == "BELOW" and price <= alert["threshold"])
            or (condition == "SIGNAL_BUY" and result["signal"] == "BUY")
            or (condition == "SIGNAL_SELL" and result["signal"] == "SELL")
        )
        if is_triggered:
            triggered.append(
                {
                    **alert,
                    "market_price": price,
                    "market_signal": result["signal"],
                }
            )
    return triggered
