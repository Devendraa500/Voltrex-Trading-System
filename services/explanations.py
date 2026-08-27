from typing import Any


def explain_scan_result(result: dict[str, Any]) -> dict[str, Any]:
    signal = result.get("signal", "HOLD")
    regime = result.get("regime", "SIDEWAYS")
    technical = result.get("technical_signal", "HOLD")
    rr = float(result.get("risk_reward", 0))
    volume_ratio = float(result.get("volume_ratio", 0))
    score = float(result.get("score", 0))

    evidence = []
    risks = []
    if signal == technical and signal != "HOLD":
        evidence.append(f"Price structure and indicators both confirm {signal}.")
    if (signal == "BUY" and regime == "BULL") or (
        signal == "SELL" and regime == "BEAR"
    ):
        evidence.append(f"The {regime.lower()} regime supports the setup.")
    if rr >= 2:
        evidence.append(f"Projected reward-to-risk is {rr:.2f}.")
    elif signal != "HOLD":
        risks.append(f"Reward-to-risk is only {rr:.2f}.")
    if volume_ratio >= 1.2:
        evidence.append(
            f"Volume is {volume_ratio:.2f}x its 20-session average."
        )
    else:
        risks.append("Volume confirmation is limited.")
    if regime == "SIDEWAYS":
        risks.append("The broader regime is sideways and can produce whipsaws.")
    if signal == "HOLD":
        risks.append("No directional equilibrium setup currently passes filters.")

    confidence = "HIGH" if score >= 75 else "MEDIUM" if score >= 50 else "LOW"
    summary = (
        f"{signal} setup for {result.get('symbol', 'the instrument')} with "
        f"{confidence.lower()} confidence ({score:.0f}/100)."
    )
    return {
        "summary": summary,
        "confidence": confidence,
        "evidence": evidence,
        "risks": risks,
        "disclaimer": (
            "Decision support only. Validate liquidity, execution costs, and "
            "portfolio exposure before placing an order."
        ),
    }
