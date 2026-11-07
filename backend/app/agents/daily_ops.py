"""Daily Ops agent. Code builds the End-of-Day Wrap-Up from pending work."""
import re
from datetime import timedelta

from .. import config
from ..db import query


def _outside_range(value, normal_range):
    m = re.match(r"\s*([\d.]+)\s*-\s*([\d.]+)", normal_range or "")
    return bool(m and value is not None and not float(m.group(1)) <= value <= float(m.group(2)))


def wrap_up():
    since = config.TODAY - timedelta(days=14)
    unsigned = query("SELECT d.id, d.draft_type, d.patient_id, p.name FROM draft d JOIN patient p ON p.id=d.patient_id WHERE d.status='draft' AND d.draft_type<>'follow_up' ORDER BY d.id")
    labs = query("SELECT f.id, f.label, f.value_num, f.unit, f.normal_range, f.fact_date::text AS date, f.patient_id, p.name FROM fact f JOIN patient p ON p.id=f.patient_id WHERE f.fact_type='lab' AND f.status IN ('verified','corrected') AND f.fact_date>=%s ORDER BY f.fact_date DESC", (since,))
    abnormal = [l for l in labs if _outside_range(l["value_num"], l["normal_range"])]
    checks = query("SELECT r.id, r.reason, d.file_name FROM review_item r JOIN document d ON d.id=r.document_id WHERE r.status='open' ORDER BY r.id")
    follow = query("SELECT d.id, d.content->>'reason' AS reason, d.status, p.name, d.patient_id FROM draft d JOIN patient p ON p.id=d.patient_id WHERE d.draft_type='follow_up' ORDER BY d.id")
    return {"unsigned": unsigned, "abnormal": abnormal, "checks": checks, "follow_ups": follow}
