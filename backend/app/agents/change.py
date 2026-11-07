"""Change agent. Code compares verified records with the last visit, and finds missing records."""
from .. import config
from ..db import one, query
from ..reference import FOLLOW_UP_RULES, LAB_TESTS, medicine_key
from ..services.trends import lab_series

TRUSTED = "('verified','corrected')"


def last_visit(patient_id):
    return one("SELECT max(visit_date) AS d FROM visit WHERE patient_id=%s AND status='completed'", (patient_id,))["d"]


def changes_since_last_visit(patient_id):
    since = last_visit(patient_id)
    if not since:
        return {"since": None, "items": []}
    items = []
    for code, pts in lab_series(patient_id).items():
        new = [p for p in pts if p[0] > since]
        if not new:
            continue
        latest = new[-1]
        before = [p for p in pts if p[0] <= since]
        t = LAB_TESTS[code]
        if before:
            text = f"{t['name']} changed from {before[-1][1]:g} to {latest[1]:g} {t['unit']}." if before[-1][1] != latest[1] else f"{t['name']} unchanged at {latest[1]:g} {t['unit']}."
        else:
            text = f"New {t['name']} result: {latest[1]:g} {t['unit']}."
        items.append({"type": "lab", "text": text, "fact_id": latest[2], "code": code})
    earlier = {medicine_key(r["label"]) for r in query(f"SELECT label FROM fact WHERE patient_id=%s AND fact_type='medicine' AND status IN {TRUSTED} AND fact_date<=%s", (patient_id, since))}
    for m in query(f"SELECT id, label, value_text, frequency, fact_date FROM fact WHERE patient_id=%s AND fact_type='medicine' AND status IN {TRUSTED} AND fact_date>%s ORDER BY fact_date", (patient_id, since)):
        prefix = "New medicine on record" if medicine_key(m["label"]) not in earlier else "Medicine recorded again"
        items.append({"type": "medicine", "text": f"{prefix}: {m['label']} {m['value_text']}, {m['frequency']}.", "fact_id": m["id"], "code": medicine_key(m["label"])})
    return {"since": since.isoformat(), "items": items}


def _months_between(d, today):
    return (today.year - d.year) * 12 + today.month - d.month - (today.day < d.day)


def missing_records(patient_id):
    conditions = " ".join(r["label"].lower() for r in query(f"SELECT label FROM fact WHERE patient_id=%s AND fact_type='condition' AND status IN {TRUSTED}", (patient_id,)))
    series = lab_series(patient_id)
    alerts = []
    for rule in FOLLOW_UP_RULES:
        if rule["condition"] not in conditions:
            continue
        name = LAB_TESTS[rule["code"]]["name"]
        pts = series.get(rule["code"])
        if not pts:
            alerts.append({"code": rule["code"], "text": f"No {name} on file.", "last_seen": None, "fact_id": None})
        elif (config.TODAY - pts[-1][0]).days > rule["max_days"]:
            months = _months_between(pts[-1][0], config.TODAY)
            alerts.append({"code": rule["code"], "text": f"No {name} on file for {months} months.", "last_seen": pts[-1][0].isoformat(), "fact_id": pts[-1][2]})
    return alerts
