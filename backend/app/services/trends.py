"""Hidden Trend Finder. Code, not AI, decides whether a slow change exists."""
import math
from collections import defaultdict

from ..db import query
from ..reference import LAB_TESTS

MIN_POINTS = 4
MIN_DAYS = 180
Z_95 = 1.96


def mann_kendall_z(values):
    n = len(values)
    s = sum((values[j] > values[i]) - (values[j] < values[i]) for i in range(n - 1) for j in range(i + 1, n))
    ties = defaultdict(int)
    for v in values:
        ties[v] += 1
    var = (n * (n - 1) * (2 * n + 5) - sum(t * (t - 1) * (2 * t + 5) for t in ties.values())) / 18
    if var <= 0 or s == 0:
        return 0.0
    return (s - 1 if s > 0 else s + 1) / math.sqrt(var)


def find_trend(code, points):
    """points are (date, value, fact_id) sorted by date. Returns a finding or None."""
    test = LAB_TESTS[code]
    if len(points) < MIN_POINTS or (points[-1][0] - points[0][0]).days < MIN_DAYS:
        return None
    values = [p[1] for p in points]
    z = mann_kendall_z(values)
    change = values[-1] - values[0]
    direction = "down" if change < 0 else "up"
    if abs(z) < Z_95 or direction != test["watch"] or abs(change) < test["threshold"]:
        return None
    months = round((points[-1][0] - points[0][0]).days / 30.44)
    span = f"{round(months / 12)} years" if months >= 24 else f"{months} months"
    word = "fell" if direction == "down" else "rose"
    return {
        "code": code,
        "test": test["name"],
        "direction": direction,
        "first": values[0],
        "last": values[-1],
        "unit": test["unit"],
        "span": span,
        "count": len(points),
        "fact_ids": [p[2] for p in points],
        "points": [{"date": p[0].isoformat(), "value": p[1], "fact_id": p[2]} for p in points],
        "region": test["region"],
        "summary": f"{test['name']} {word} from {values[0]:g} to {values[-1]:g} {test['unit']} over {span}.",
        "detail": f"Recent reports may each look minor when viewed alone. The change shows only when all {len(points)} are compared.",
    }


def lab_series(patient_id):
    rows = query(
        "SELECT id, code, value_num, fact_date FROM fact WHERE patient_id=%s AND fact_type='lab' AND status IN ('verified','corrected') AND code IS NOT NULL AND fact_date IS NOT NULL ORDER BY fact_date",
        (patient_id,),
    )
    series = defaultdict(list)
    for r in rows:
        series[r["code"]].append((r["fact_date"], r["value_num"], r["id"]))
    return series


def hidden_trends(patient_id):
    found = [find_trend(code, pts) for code, pts in lab_series(patient_id).items()]
    return [f for f in found if f]
