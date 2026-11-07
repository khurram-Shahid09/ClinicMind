"""Brief agent. Writes the morning brief from verified facts, and every line must cite a real fact."""
import json

from .. import ai
from ..db import Jsonb, log_run, one, query, run
from ..services.trends import hidden_trends
from .change import changes_since_last_visit, missing_records

PROMPT = """Write a short morning brief that a busy doctor can read in 15 seconds, using only the facts below.
Rules:
- Use plain, simple English and at most 5 short lines, with the most important first.
- Report only what the records show. Never suggest a diagnosis, cause or treatment, and never link two facts as cause and effect.
- Every line must list the numeric fact_ids it comes from. Use only fact_ids given below. Lines with no fact use an empty list.
Return only JSON: {"headline":"one short sentence","items":[{"text":"","fact_ids":[1]}]}

FACTS:
"""


def build_facts(patient_id):
    return {
        "changes_since_last_visit": changes_since_last_visit(patient_id),
        "slow_changes": [{"summary": t["summary"], "fact_ids": t["fact_ids"]} for t in hidden_trends(patient_id)],
        "missing_records": missing_records(patient_id),
    }


def _template(facts):
    items = [{"text": t["summary"], "fact_ids": t["fact_ids"]} for t in facts["slow_changes"]]
    items += [{"text": c["text"], "fact_ids": [c["fact_id"]]} for c in facts["changes_since_last_visit"]["items"]]
    items += [{"text": m["text"], "fact_ids": [m["fact_id"]] if m["fact_id"] else []} for m in facts["missing_records"]]
    if not items:
        items = [{"text": "No new records since the last visit.", "fact_ids": []}]
    return {"headline": items[0]["text"], "items": items[:5]}


def _allowed_ids(facts):
    ids = set()
    for t in facts["slow_changes"]:
        ids.update(t["fact_ids"])
    for c in facts["changes_since_last_visit"]["items"]:
        ids.add(c["fact_id"])
    for m in facts["missing_records"]:
        if m["fact_id"]:
            ids.add(m["fact_id"])
    return ids


def make_brief(patient_id, use_ai=True):
    facts = build_facts(patient_id)
    saved = False
    if use_ai:
        # Fact ids can differ between database resets, so saved results are keyed by the facts themselves.
        result, saved = ai.generate_json("brief", PROMPT + json.dumps(facts, sort_keys=True))
        allowed = _allowed_ids(facts)
        items = [{"text": i.get("text", ""), "fact_ids": [f for f in i.get("fact_ids", []) if f in allowed]} for i in result.get("items", [])]
        if any(not set(i.get("fact_ids", [])) <= allowed for i in result.get("items", [])):
            result, items = _template(facts), None
        items = items or result["items"]
        brief = {"headline": items[0]["text"] if items else "No new records since the last visit.", "items": items}
    else:
        brief = _template(facts)
    run(
        "INSERT INTO brief (patient_id, headline, items, saved_run) VALUES (%s,%s,%s,%s) ON CONFLICT (patient_id) DO UPDATE SET headline=EXCLUDED.headline, items=EXCLUDED.items, saved_run=EXCLUDED.saved_run, generated_at=now()",
        (patient_id, brief["headline"], Jsonb(brief["items"]), saved),
    )
    log_run("Brief", f"Prepared a brief with {len(brief['items'])} lines", patient_id, saved=saved)
    return brief


def get_brief(patient_id):
    return one("SELECT headline, items, saved_run, generated_at FROM brief WHERE patient_id=%s", (patient_id,))


def all_patient_ids():
    return [r["id"] for r in query("SELECT id FROM patient ORDER BY id")]
