import math
from typing import Any


def calculate_equilibrium_levels(actual_value: float) -> dict[str, Any]:
    """Calculate Voltrex square-root harmonic equilibrium levels."""
    if actual_value <= 0:
        raise ValueError("actual_value must be greater than zero")

    if actual_value >= 40000:
        rounded = round(actual_value / 100) * 100
    else:
        rounded = round(actual_value / 10) * 10

    root = math.sqrt(rounded)
    sum1 = math.floor(root)
    sum2 = sum1 + 2 if rounded > sum1 * (sum1 + 1) else sum1 + 1

    tv = sum1 * sum2

    qr1_raw = sum1 * (sum2 + 2)
    qr2_raw = sum1 * (sum2 + 4)
    qr3_raw = sum1 * (sum2 + 6)

    qs1_raw = sum1 * (sum2 - 2)
    qs2_raw = sum1 * (sum2 - 4)
    qs3_raw = sum1 * (sum2 - 6)

    qr1 = qr1_raw - sum1
    qr2 = qr2_raw - sum1
    qr3 = qr3_raw - sum1

    qs1 = qs1_raw + sum1
    qs2 = qs2_raw + sum1
    qs3 = qs3_raw + sum1

    difference = qr1_raw - qs1_raw
    sl_points = difference / 6
    option_sl = sl_points / 3
    sl_price = tv - sl_points

    reward = qr1 - tv
    risk = tv - sl_price
    rr_ratio = reward / risk if risk else 0

    return {
        "rounded": rounded,
        "root": round(root, 2),
        "sum1": sum1,
        "sum2": sum2,
        "tv": round(tv, 2),
        "qr1": round(qr1, 2),
        "qr2": round(qr2, 2),
        "qr3": round(qr3, 2),
        "qs1": round(qs1, 2),
        "qs2": round(qs2, 2),
        "qs3": round(qs3, 2),
        "sl_points": round(sl_points, 2),
        "option_sl": round(option_sl, 2),
        "sl_price": round(sl_price, 2),
        "rr_ratio": round(rr_ratio, 2),
        "qr1_raw": round(qr1_raw, 2),
        "qr2_raw": round(qr2_raw, 2),
        "qr3_raw": round(qr3_raw, 2),
        "qs1_raw": round(qs1_raw, 2),
        "qs2_raw": round(qs2_raw, 2),
        "qs3_raw": round(qs3_raw, 2),
    }
