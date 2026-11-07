"""Patient portal, QR check-in, emergency card, share links, alerts and clinic pulse."""
import re
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

from . import config
from .agents.change import missing_records
from .db import Jsonb, log_run, one, query, run
from .reference import LAB_MEANING, READING_LIMITS, medicine_key, outside_range
from .services import automation

router = APIRouter()
api = "/api/v1"
TRUSTED = "status IN ('verified','corrected')"
MINUTES_PER_PATIENT = 10
URGENT_SYMPTOMS = {"Chest pain"}
SLOTS = {"twice daily": ["morning", "evening"], "once daily": ["morning"], "at night": ["night"], "three times daily": ["morning", "afternoon", "evening"]}
URDU_INSTRUCTIONS = [
    {"name": "Metformin 500 mg", "urdu": "دن میں دو بار، صبح اور شام لیں۔"},
    {"name": "Amlodipine 5 mg", "urdu": "دن میں ایک بار، صبح لیں۔"},
    {"name": "Atorvastatin 10 mg", "urdu": "دن میں ایک بار، رات کو لیں۔"},
]


def log_access(patient_id, who, what):
    run("INSERT INTO access_log (patient_id, who, what) VALUES (%s,%s,%s)", (patient_id, who, what))


def _unlock(token, birth_year):
    p = one("SELECT * FROM patient WHERE portal_token=%s", (token,))
    if not p:
        raise HTTPException(404, "This link is not valid.")
    if str(p["dob"].year) != str(birth_year or ""):
        raise HTTPException(401, "That birth year does not match.")
    return p


def _queue_state(patient_id):
    visit = one("SELECT id, visit_time, reason FROM visit WHERE patient_id=%s AND visit_date=%s AND status='scheduled'", (patient_id, config.TODAY))
    if not visit:
        return None
    entry = one("SELECT * FROM queue_entry WHERE visit_id=%s", (visit["id"],))
    state = {"visit_id": visit["id"], "time": visit["visit_time"], "reason": visit["reason"], "checked_in": bool(entry)}
    if entry:
        ahead = one("SELECT count(*) AS n FROM queue_entry WHERE status='waiting' AND token_no<%s", (entry["token_no"],))["n"] if entry["status"] == "waiting" else 0
        state.update(token=entry["token_no"], status=entry["status"], ahead=ahead, minutes=ahead * MINUTES_PER_PATIENT)
    return state


def _medicines_today(patient_id):
    rows = query(f"SELECT label, value_text, frequency, fact_date, code FROM fact WHERE patient_id=%s AND fact_type='medicine' AND {TRUSTED} ORDER BY fact_date", (patient_id,))
    latest = {medicine_key(r["label"]): r for r in rows}
    doses = {(d["medicine"], d["slot"]): d["taken"] for d in query("SELECT medicine, slot, taken FROM medicine_dose WHERE patient_id=%s AND dose_date=%s", (patient_id, config.TODAY))}
    out = []
    for key, m in latest.items():
        slots = SLOTS.get((m["frequency"] or "").lower().strip(), [])
        if key == "ibuprofen":
            # Short pain courses from another clinic are not tracked as daily medicines.
            continue
        out.append({"key": key, "name": m["label"], "dose": m["value_text"], "frequency": m["frequency"], "slots": [{"slot": s, "taken": doses.get((key, s), False)} for s in slots]})
    return out


def _labs(patient_id):
    rows = query(f"SELECT id, code, label, value_num, unit, normal_range, fact_date::text AS date FROM fact WHERE patient_id=%s AND fact_type='lab' AND code IS NOT NULL AND {TRUSTED} ORDER BY fact_date", (patient_id,))
    groups = {}
    for r in rows:
        groups.setdefault(r["code"], []).append(r)
    return [
        {"code": code, "name": items[-1]["label"], "value": items[-1]["value_num"], "unit": items[-1]["unit"], "date": items[-1]["date"], "range": items[-1]["normal_range"],
         "outside": outside_range(items[-1]["value_num"], items[-1]["normal_range"]), "meaning": LAB_MEANING.get(code), "fact_id": items[-1]["id"], "history": [{"value": i["value_num"], "date": i["date"]} for i in items]}
        for code, items in groups.items()
    ]


@router.get(api + "/portal/{token}/hello")
def portal_hello(token: str):
    p = one("SELECT name FROM patient WHERE portal_token=%s", (token,))
    if not p:
        raise HTTPException(404, "This link is not valid.")
    return {"first_name": p["name"].split()[0]}


@router.get(api + "/portal/{token}")
def portal(token: str, refresh: bool = False, x_birth_year: str | None = Header(None)):
    p = _unlock(token, x_birth_year)
    pid = p["id"]
    if not refresh:
        log_access(pid, "You", "Opened your health page")
    facts = query(f"SELECT DISTINCT ON (lower(label)) fact_type, label, value_text FROM fact WHERE patient_id=%s AND fact_type IN ('allergy','condition') AND {TRUSTED} ORDER BY lower(label)", (pid,))
    conditions = [f["label"] for f in facts if f["fact_type"] == "condition"]
    conditions = [c for c in conditions if not any(c != o and c.lower() in o.lower() for o in conditions)]
    next_visit = one("SELECT visit_date::text AS date, visit_time, reason FROM visit WHERE patient_id=%s AND status='scheduled' AND visit_date>=%s ORDER BY visit_date LIMIT 1", (pid, config.TODAY))
    prev = one("SELECT p.* FROM previsit p JOIN visit v ON v.id=p.visit_id WHERE p.patient_id=%s AND v.visit_date=%s", (pid, config.TODAY))
    return {
        "name": p["name"], "age": config.TODAY.year - p["dob"].year, "doctor": config.DOCTOR_NAME, "today": config.TODAY.isoformat(),
        "next_visit": next_visit, "queue": _queue_state(pid),
        "conditions": conditions, "allergies": [{"label": f["label"], "reaction": f["value_text"]} for f in facts if f["fact_type"] == "allergy"],
        "due": missing_records(pid), "labs": _labs(pid), "medicines": _medicines_today(pid), "adherence": automation.adherence(pid),
        "readings": query("SELECT kind, value, value2, reading_date::text AS date, flagged FROM home_reading WHERE patient_id=%s ORDER BY reading_date DESC, id DESC LIMIT 8", (pid,)),
        "messages": query("SELECT id, channel, body_en, body_ur, reply, sent_at FROM message WHERE patient_id=%s AND audience='patient' AND status='sent' ORDER BY id DESC", (pid,)),
        "history": query("SELECT id, doc_type, doc_date::text AS date FROM document WHERE patient_id=%s AND doc_date IS NOT NULL ORDER BY doc_date DESC", (pid,)),
        "instructions": URDU_INSTRUCTIONS if p["mrn"] == "CM-1042" else [], "has_audio": p["mrn"] == "CM-1042" and (config.DEMO_DATA / "audio/urdu-instructions.wav").exists(),
        "previsit": prev, "emergency_token": p["emergency_token"],
        "shares": query("SELECT id, token, expires_at, revoked FROM share_link WHERE patient_id=%s ORDER BY id DESC", (pid,)),
        "access": query("SELECT who, what, created_at FROM access_log WHERE patient_id=%s ORDER BY id DESC LIMIT 8", (pid,)),
        "family_name": p["family_name"], "family_opt_in": p["family_opt_in"], "whatsapp_opt_in": p["whatsapp_opt_in"],
    }


class Dose(BaseModel):
    medicine: str
    slot: str
    taken: bool


@router.post(api + "/portal/{token}/doses")
def portal_dose(token: str, d: Dose, x_birth_year: str | None = Header(None)):
    p = _unlock(token, x_birth_year)
    run("INSERT INTO medicine_dose (patient_id, medicine, dose_date, slot, taken) VALUES (%s,%s,%s,%s,%s) ON CONFLICT (patient_id, medicine, dose_date, slot) DO UPDATE SET taken=EXCLUDED.taken", (p["id"], d.medicine, config.TODAY, d.slot, d.taken))
    return {"ok": True, "adherence": automation.adherence(p["id"])}


class Reading(BaseModel):
    kind: str
    value: float
    value2: float | None = None


@router.post(api + "/portal/{token}/readings")
def portal_reading(token: str, r: Reading, x_birth_year: str | None = Header(None)):
    p = _unlock(token, x_birth_year)
    if r.kind not in READING_LIMITS:
        raise HTTPException(422, "Unknown reading type.")
    limits = READING_LIMITS[r.kind]
    if not limits["min"] <= r.value <= limits["max"]:
        raise HTTPException(422, "That number does not look right. Please check it.")
    flagged = automation.is_high(r.kind, r.value, r.value2)
    row = one("INSERT INTO home_reading (patient_id, kind, value, value2, reading_date, flagged) VALUES (%s,%s,%s,%s,%s,%s) RETURNING id", (p["id"], r.kind, r.value, r.value2, config.TODAY, flagged))
    log_run("Home reading", f"{p['name']} logged {automation.reading_text(r.kind, r.value, r.value2)}", p["id"], actor="Patient", status="needs_review" if flagged else "done")
    if flagged:
        automation.check_reading(p, {"id": row["id"], "kind": r.kind, "value": r.value, "value2": r.value2})
    return {"flagged": flagged}


@router.post(api + "/portal/{token}/checkin")
def portal_checkin(token: str, x_birth_year: str | None = Header(None)):
    p = _unlock(token, x_birth_year)
    visit = one("SELECT id FROM visit WHERE patient_id=%s AND visit_date=%s AND status='scheduled'", (p["id"], config.TODAY))
    if not visit:
        raise HTTPException(409, "You have no visit booked today.")
    if not one("SELECT visit_id FROM queue_entry WHERE visit_id=%s", (visit["id"],)):
        number = one("SELECT COALESCE(max(token_no),0)+1 AS n FROM queue_entry")["n"]
        run("INSERT INTO queue_entry (visit_id, patient_id, token_no) VALUES (%s,%s,%s)", (visit["id"], p["id"], number))
        log_run("Check-in", f"{p['name']} checked in by QR code. Token {number}.", p["id"], actor="Patient")
    return _queue_state(p["id"])


class Previsit(BaseModel):
    symptoms: list[str]
    note: str | None = None
    question: str | None = None


@router.post(api + "/portal/{token}/previsit")
def portal_previsit(token: str, body: Previsit, x_birth_year: str | None = Header(None)):
    p = _unlock(token, x_birth_year)
    visit = one("SELECT id FROM visit WHERE patient_id=%s AND visit_date=%s AND status='scheduled'", (p["id"], config.TODAY))
    if not visit:
        raise HTTPException(409, "You have no visit booked today.")
    run("INSERT INTO previsit (visit_id, patient_id, symptoms, note, question) VALUES (%s,%s,%s,%s,%s) ON CONFLICT (visit_id) DO UPDATE SET symptoms=EXCLUDED.symptoms, note=EXCLUDED.note, question=EXCLUDED.question, created_at=now()", (visit["id"], p["id"], Jsonb(body.symptoms), body.note, body.question))
    log_run("Before your visit", f"{p['name']} sent answers before the visit", p["id"], actor="Patient")
    urgent = [s for s in body.symptoms if s in URGENT_SYMPTOMS]
    if urgent:
        rule = one("SELECT * FROM alert_rule WHERE code='doctor_reading'")
        automation.create(rule, f"previsit:{visit['id']}", p, f"{p['name']} reported {', '.join(urgent).lower()} before today's visit. Please see this straight away.")
    return {"ok": True, "urgent": bool(urgent)}


@router.post(api + "/portal/{token}/share")
def portal_share(token: str, x_birth_year: str | None = Header(None)):
    p = _unlock(token, x_birth_year)
    link = secrets.token_urlsafe(16)
    expires = datetime.now(timezone.utc) + timedelta(hours=48)
    run("INSERT INTO share_link (patient_id, token, expires_at) VALUES (%s,%s,%s)", (p["id"], link, expires))
    log_access(p["id"], "You", "Created a 48-hour share link")
    return {"token": link, "expires_at": expires}


@router.delete(api + "/portal/{token}/share/{share_id}")
def portal_share_revoke(token: str, share_id: int, x_birth_year: str | None = Header(None)):
    p = _unlock(token, x_birth_year)
    run("UPDATE share_link SET revoked=TRUE WHERE id=%s AND patient_id=%s", (share_id, p["id"]))
    log_access(p["id"], "You", "Stopped a share link")
    return {"ok": True}


class Reply(BaseModel):
    reply: str


@router.post(api + "/portal/{token}/messages/{message_id}/reply")
def portal_reply(token: str, message_id: int, body: Reply, x_birth_year: str | None = Header(None)):
    p = _unlock(token, x_birth_year)
    run("UPDATE message SET reply=%s WHERE id=%s AND patient_id=%s", (body.reply, message_id, p["id"]))
    log_run("Auto Alerts", f"{p['name']} replied {body.reply}", p["id"], actor="Patient")
    return {"ok": True}


@router.get(api + "/portal/{token}/source/{fact_id}")
def portal_source(token: str, fact_id: int, x_birth_year: str | None = Header(None)):
    p = _unlock(token, x_birth_year)
    f = one(f"SELECT document_id FROM fact WHERE id=%s AND patient_id=%s AND {TRUSTED}", (fact_id, p["id"]))
    if not f:
        raise HTTPException(404, "Report not found.")
    return {"image_url": f"{api}/documents/{f['document_id']}/image"}


def _card(p):
    pid = p["id"]
    facts = query(f"SELECT DISTINCT ON (fact_type, lower(label)) fact_type, label, value_text, frequency, fact_date FROM fact WHERE patient_id=%s AND fact_type IN ('allergy','condition') AND {TRUSTED} ORDER BY fact_type, lower(label), fact_date DESC", (pid,))
    conditions = [f["label"] for f in facts if f["fact_type"] == "condition"]
    conditions = [c for c in conditions if not any(c != o and c.lower() in o.lower() for o in conditions)]
    last = one(f"SELECT max(fact_date)::text AS d FROM fact WHERE patient_id=%s AND {TRUSTED}", (pid,))["d"]
    return {
        "name": p["name"], "age": config.TODAY.year - p["dob"].year, "sex": p["sex"], "allergies": [{"label": f["label"], "reaction": f["value_text"]} for f in facts if f["fact_type"] == "allergy"],
        "conditions": conditions, "medicines": [f"{m['name']} {m['dose'] or ''}".strip() for m in _medicines_today(pid)], "family_name": p["family_name"], "family_phone": p["family_phone"], "clinic_doctor": config.DOCTOR_NAME, "last_record": last,
    }


@router.get(api + "/emergency/{token}")
def emergency(token: str):
    p = one("SELECT * FROM patient WHERE emergency_token=%s", (token,))
    if not p:
        raise HTTPException(404, "This card is not valid.")
    log_access(p["id"], "Someone with the emergency QR code", "Opened the emergency card")
    return _card(p)


@router.get(api + "/shared/{token}")
def shared(token: str):
    s = one("SELECT * FROM share_link WHERE token=%s", (token,))
    if not s or s["revoked"] or s["expires_at"] < datetime.now(timezone.utc):
        raise HTTPException(410, "This link has ended. Please ask the patient for a new one.")
    p = one("SELECT * FROM patient WHERE id=%s", (s["patient_id"],))
    log_access(p["id"], "Someone with your share link", "Opened your shared record")
    return {**_card(p), "labs": _labs(p["id"]), "expires_at": s["expires_at"], "history": query("SELECT doc_type, doc_date::text AS date FROM document WHERE patient_id=%s AND doc_date IS NOT NULL ORDER BY doc_date DESC LIMIT 12", (p["id"],))}


@router.get(api + "/queue")
def queue():
    rows = query("SELECT q.visit_id, q.token_no, q.status, p.name FROM queue_entry q JOIN patient p ON p.id=q.patient_id ORDER BY q.token_no")
    # The waiting room screen shows first names only, for privacy.
    public = [{**r, "name": r["name"].split()[0]} for r in rows]
    return {"now": next((r for r in reversed(public) if r["status"] == "with_doctor"), None), "waiting": [r for r in public if r["status"] == "waiting"], "minutes_each": MINUTES_PER_PATIENT, "doctor": config.DOCTOR_NAME}


@router.post(api + "/queue/next")
def queue_next():
    next_up = one("SELECT q.visit_id, p.name, q.token_no, q.patient_id FROM queue_entry q JOIN patient p ON p.id=q.patient_id WHERE q.status='waiting' ORDER BY q.token_no LIMIT 1")
    if not next_up:
        raise HTTPException(409, "No one is waiting.")
    run("UPDATE queue_entry SET status='done' WHERE status='with_doctor'")
    run("UPDATE queue_entry SET status='with_doctor' WHERE visit_id=%s", (next_up["visit_id"],))
    log_run("Check-in", f"Called token {next_up['token_no']}: {next_up['name']}", next_up["patient_id"], actor=config.DOCTOR_NAME)
    return queue()


@router.get(api + "/patients/{pid}/connected")
def patient_connected(pid: int):
    p = one("SELECT portal_token, emergency_token FROM patient WHERE id=%s", (pid,))
    if not p:
        raise HTTPException(404, "Patient not found")
    prev = one("SELECT p.symptoms, p.note, p.question FROM previsit p JOIN visit v ON v.id=p.visit_id WHERE p.patient_id=%s AND v.visit_date=%s", (pid, config.TODAY))
    return {
        **p, "adherence": automation.adherence(pid), "queue": _queue_state(pid), "previsit": prev, "public_url": config.PUBLIC_URL,
        "readings": query("SELECT kind, value, value2, reading_date::text AS date, flagged FROM home_reading WHERE patient_id=%s ORDER BY reading_date, id", (pid,)),
    }


@router.get(api + "/automation")
def automation_view():
    rules = query("SELECT r.*, (SELECT count(*) FROM message m WHERE m.rule_code=r.code AND m.status='sent') AS sent FROM alert_rule r ORDER BY position")
    messages = query("SELECT m.*, p.name, r.name AS rule_name FROM message m JOIN patient p ON p.id=m.patient_id JOIN alert_rule r ON r.code=m.rule_code ORDER BY m.id DESC LIMIT 100")
    return {"rules": rules, "messages": [m for m in messages if m["audience"] != "doctor"], "doctor_alerts": [m for m in messages if m["audience"] == "doctor" and m["status"] == "new"], "hook_on": bool(__import__("os").getenv("ALERT_WEBHOOK_URL"))}


class RuleEdit(BaseModel):
    enabled: bool | None = None
    auto_send: bool | None = None


@router.patch(api + "/automation/rules/{code}")
def automation_rule(code: str, body: RuleEdit):
    if body.enabled is not None:
        run("UPDATE alert_rule SET enabled=%s WHERE code=%s", (body.enabled, code))
    if body.auto_send is not None:
        run("UPDATE alert_rule SET auto_send=%s WHERE code=%s", (body.auto_send, code))
    return automation_view()


@router.post(api + "/automation/run")
def automation_run():
    return {"created": automation.run_rules(), **automation_view()}


@router.post(api + "/automation/messages/{mid}/{action}")
def automation_message(mid: int, action: str):
    m = one("SELECT * FROM message WHERE id=%s", (mid,))
    if not m:
        raise HTTPException(404, "Message not found")
    if action == "approve" and m["status"] == "waiting":
        automation.deliver(mid)
        log_run("Auto Alerts", f"Doctor approved a message: {m['body_en'][:60]}", m["patient_id"], actor=config.DOCTOR_NAME)
    elif action == "dismiss":
        run("UPDATE message SET status='dismissed' WHERE id=%s", (mid,))
    else:
        raise HTTPException(422, "Unknown action")
    return automation_view()


@router.get(api + "/pulse")
def pulse():
    today = config.TODAY
    visits = one("SELECT count(*) AS n FROM visit WHERE visit_date=%s", (today,))["n"]
    arrived = one("SELECT count(*) AS n FROM queue_entry")["n"]
    waiting = one("SELECT count(*) AS n FROM queue_entry WHERE status='waiting'")["n"]
    msg = one("SELECT count(*) FILTER (WHERE status='sent') AS sent, count(*) FILTER (WHERE status='waiting') AS waiting, count(*) FILTER (WHERE reply IS NOT NULL) AS replied, count(*) FILTER (WHERE status='skipped') AS skipped FROM message WHERE audience<>'doctor'")
    patients = query("SELECT id, name FROM patient ORDER BY name")
    adherence = []
    overdue = []
    for p in patients:
        a = automation.adherence(p["id"])
        if a is not None:
            adherence.append({"id": p["id"], "name": p["name"], "value": a})
        for m in missing_records(p["id"]):
            overdue.append({"id": p["id"], "name": p["name"], "text": m["text"]})
    flagged = query("SELECT r.patient_id AS id, p.name, r.kind, r.value, r.value2, r.reading_date::text AS date FROM home_reading r JOIN patient p ON p.id=r.patient_id WHERE r.flagged ORDER BY r.id DESC LIMIT 6")
    return {"visits": visits, "arrived": arrived, "waiting": waiting, "wait_minutes": waiting * MINUTES_PER_PATIENT, "messages": msg, "adherence": sorted(adherence, key=lambda x: x["value"]), "overdue": overdue, "flagged": [{**f, "text": automation.reading_text(f["kind"], f["value"], f["value2"])} for f in flagged], "doctor_alerts": one("SELECT count(*) AS n FROM message WHERE audience='doctor' AND status='new'")["n"], "follow_up_rule": re.sub(r"\s+", " ", "Based on the 14 days before today.")}
