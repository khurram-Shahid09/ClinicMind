"""Follow-up agent. Code finds overdue items, AI drafts a reminder, and nothing is sent in version 1."""
from .. import ai, config
from ..db import Jsonb, log_run, one, query, run
from ..reference import LAB_TESTS
from .change import missing_records


def _draft_text(name, test, gap):
    prompt = f"""Write a short, polite reminder from {config.DOCTOR_NAME}'s clinic to patient {name}: their {test} test is due ({gap}).
Do not give medical advice. Return only JSON: {{"urdu":"message in simple Urdu script","english":"same message in simple English"}}"""
    return ai.generate_json("followup", prompt)


def refresh():
    """Creates a draft for each overdue item that does not have one yet."""
    for p in query("SELECT id, name FROM patient ORDER BY id"):
        for m in missing_records(p["id"]):
            exists = one("SELECT id FROM draft WHERE patient_id=%s AND draft_type='follow_up' AND content->>'code'=%s", (p["id"], m["code"]))
            if exists:
                continue
            text, saved = _draft_text(p["name"], LAB_TESTS[m["code"]]["name"], m["text"])
            run("INSERT INTO draft (patient_id, draft_type, content) VALUES (%s,'follow_up',%s)", (p["id"], Jsonb({**text, "code": m["code"], "reason": m["text"], "fact_id": m["fact_id"]})))
            log_run("Follow-up", f"Drafted a reminder: {m['text']}", p["id"], saved=saved)


def list_all():
    return query("SELECT d.id, d.patient_id, d.content, d.status, p.name FROM draft d JOIN patient p ON p.id=d.patient_id WHERE d.draft_type='follow_up' ORDER BY d.id")
