"""Patient Story Replay. Builds a time-ordered script from verified data only. No AI is involved."""
from ..db import query
from ..reference import CONDITION_REGIONS, LAB_TESTS
from .trends import hidden_trends


def _condition_region(name):
    n = name.lower()
    return next((r for k, r in CONDITION_REGIONS.items() if k in n), None)


def build(patient_id):
    facts = query("SELECT id, fact_type, code, label, value_text, value_num, unit, frequency, fact_date FROM fact WHERE patient_id=%s AND status IN ('verified','corrected') AND fact_date IS NOT NULL ORDER BY fact_date, id", (patient_id,))
    events = []
    seen = set()
    for f in facts:
        date = f["fact_date"].isoformat()
        if f["fact_type"] == "lab" and f["code"]:
            t = LAB_TESTS[f["code"]]
            events.append({"date": date, "kind": "lab", "code": f["code"], "text": f"{t['name']}: {f['value_num']:g} {t['unit']}", "value": f["value_num"], "region": t["region"], "fact_id": f["id"]})
        elif f["fact_type"] == "medicine":
            events.append({"date": date, "kind": "medicine", "text": f"Medicine: {f['label']} {f['value_text'] or ''}".strip(), "name": f["label"], "fact_id": f["id"]})
        elif f["fact_type"] in ("condition", "allergy") and f["label"].lower() not in seen:
            seen.add(f["label"].lower())
            prefix = "Condition" if f["fact_type"] == "condition" else "Allergy"
            events.append({"date": date, "kind": f["fact_type"], "text": f"{prefix}: {f['label']}", "region": _condition_region(f["label"]), "fact_id": f["id"]})
    trends = hidden_trends(patient_id)
    return {"events": events, "trend": trends[0] if trends else None, "start": events[0]["date"] if events else None, "end": events[-1]["date"] if events else None}
