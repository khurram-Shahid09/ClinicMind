"""Document agent. Drafts patient instructions, letters and certificates for the doctor to approve."""
import json

from .. import ai, config
from ..db import one, query
from ..services.trends import hidden_trends

TRUSTED = "status IN ('verified','corrected')"


def patient_instructions(prescription, plan):
    prompt = """Write simple patient instructions in Urdu script from this approved prescription, for someone with little schooling.
Use only the information given. Do not add medicines, doses, warnings or medical advice.
Return only JSON: {"title":"","medicines":[{"name":"medicine name in English","urdu":"how to take it in simple Urdu"}],"advice":["simple Urdu lines from the doctor's plan"]}
DATA: """ + json.dumps({"prescription": prescription, "doctor_plan": plan}, ensure_ascii=False, sort_keys=True)
    return ai.generate_json("instructions", prompt)


def _record(patient_id):
    p = one("SELECT name, mrn, dob, sex FROM patient WHERE id=%s", (patient_id,))
    facts = query(f"SELECT fact_type, label, value_text, unit, fact_date::text AS date FROM fact WHERE patient_id=%s AND {TRUSTED} ORDER BY fact_date DESC", (patient_id,))
    return {"patient": {k: str(v) for k, v in p.items()}, "conditions": sorted({f["label"] for f in facts if f["fact_type"] == "condition"}),
            "allergies": [f for f in facts if f["fact_type"] == "allergy"], "latest_labs": [f for f in facts if f["fact_type"] == "lab"][:6],
            "medicines": [f for f in facts if f["fact_type"] == "medicine"][:6], "slow_changes": [t["summary"] for t in hidden_trends(patient_id)]}


def referral_letter(patient_id, to, reason):
    prompt = f"""Draft a short referral letter in clear English from {config.DOCTOR_NAME}, dated {config.TODAY}, using only the record below.
Refer to: {to}. The doctor's reason: {reason}.
Do not add a diagnosis, cause or treatment that is not in the record. Use short paragraphs.
Return only JSON: {{"subject":"","body":"letter text from Dear to the signature"}}
RECORD: """ + json.dumps(_record(patient_id), ensure_ascii=False, sort_keys=True)
    return ai.generate_json("letter", prompt)


def medical_certificate(patient_id, days, reason):
    p = one("SELECT name, mrn FROM patient WHERE id=%s", (patient_id,))
    body = f"This is to certify that {p['name']} (File No {p['mrn']}) was seen on {config.TODAY:%d %B %Y}. {reason}. The patient is advised rest for {days} day(s)."
    return {"subject": "Medical certificate", "body": f"{body}\n\n{config.DOCTOR_NAME}"}, True
