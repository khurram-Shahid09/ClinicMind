"""Auto Alerts. Code checks the rules, writes the message and hands it to a sender.

Version 1 only simulates delivery, so no real message ever leaves the app.
Setting ALERT_WEBHOOK_URL also posts each sent message to a service you control, such as n8n or Twilio.
"""
import json
import os
import urllib.request
from datetime import timedelta

from .. import config
from ..agents.change import missing_records
from ..db import log_run, one, query, run
from ..reference import LAB_TESTS, READING_LIMITS, outside_range

RULES = [
    ("appointment_reminder", "Appointment reminder", "The day before a booked visit", "patient", True, True),
    ("test_due", "Test due", "When a regular test is overdue", "patient", True, True),
    ("checkup_due", "Checkup due", "When no visit is booked and the last one was over 90 days ago", "patient", True, True),
    ("missed_doses", "Missed medicine", "When doses are unticked on 2 of the last 3 days", "patient", True, False),
    ("family_alert", "Family helper", "Tells a family member about missed medicine, only if the patient agreed", "family", True, False),
    ("high_reading", "High home reading", "When a home reading crosses the clinic's limit", "patient", True, True),
    ("doctor_reading", "Doctor alert: home reading", "Tells the doctor straight away about a flagged reading", "doctor", True, True),
    ("doctor_result", "Doctor alert: new result", "Tells the doctor about a recent result outside the normal range. Patients are never told automatically.", "doctor", True, True),
]
CHECKUP_DAYS = 90
RECENT_RESULT_DAYS = 14


def seed_rules():
    for i, (code, name, description, audience, enabled, auto) in enumerate(RULES):
        run("INSERT INTO alert_rule (code, name, description, audience, enabled, auto_send, position) VALUES (%s,%s,%s,%s,%s,%s,%s) ON CONFLICT (code) DO NOTHING", (code, name, description, audience, enabled, auto, i))


def choose_channel(patient):
    """WhatsApp first, then SMS. None means the patient has not agreed to messages."""
    if not patient.get("phone"):
        return None
    if patient.get("whatsapp_opt_in"):
        return "whatsapp"
    if patient.get("sms_opt_in"):
        return "sms"
    return None


def deliver(message_id):
    """Marks a message as sent through the simulated channel, and calls the optional hook."""
    m = one("SELECT * FROM message WHERE id=%s", (message_id,))
    url = os.getenv("ALERT_WEBHOOK_URL", "")
    if url and m["audience"] != "doctor":
        body = json.dumps({k: m[k] for k in ("id", "rule_code", "channel", "recipient", "body_en", "body_ur")}).encode()
        try:
            urllib.request.urlopen(urllib.request.Request(url, data=body, headers={"Content-Type": "application/json"}), timeout=5)
        except OSError as e:
            run("UPDATE message SET status='failed', reason=%s WHERE id=%s", (str(e)[:150], message_id))
            return
    run("UPDATE message SET status='sent', sent_at=now() WHERE id=%s", (message_id,))


def create(rule, key, patient, body_en, body_ur=None, audience=None, recipient=None):
    """Creates one message at most for each key, so a rule that runs again never repeats itself."""
    audience = audience or rule["audience"]
    dedupe = f"{rule['code']}:{patient['id']}:{key}"
    if one("SELECT id FROM message WHERE dedupe_key=%s", (dedupe,)):
        return None
    if audience == "doctor":
        channel, to, status, reason = "clinic", config.DOCTOR_NAME, "new", None
    elif audience == "family":
        channel, to = "whatsapp", recipient
        status, reason = ("waiting" if not rule["auto_send"] else "queued"), None
        if not patient.get("family_opt_in") or not recipient:
            status, reason, channel = "skipped", "The patient has not agreed to family alerts", "none"
    else:
        channel, to = choose_channel(patient), patient.get("phone")
        status, reason = ("waiting" if not rule["auto_send"] else "queued"), None
        if channel is None:
            status, reason, channel = "skipped", "The patient has not agreed to messages", "none"
    row = one(
        "INSERT INTO message (rule_code, dedupe_key, patient_id, audience, channel, recipient, body_en, body_ur, status, reason) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id",
        (rule["code"], dedupe, patient["id"], audience, channel, to, body_en, body_ur, status, reason),
    )
    if status == "queued":
        deliver(row["id"])
    return row["id"]


def is_high(kind, value, value2=None):
    limits = READING_LIMITS[kind]
    if value >= limits["high"] or value <= limits["low"]:
        return True
    return value2 is not None and value2 >= limits.get("high2", 10_000)


def reading_text(kind, value, value2=None):
    return f"{value:g}/{value2:g} mmHg" if kind == "bp" else f"{value:g} mg/dL"


def check_reading(patient, reading):
    """Runs the home reading rules at once, so a dangerous number never waits for the next check."""
    rules = {r["code"]: r for r in query("SELECT * FROM alert_rule WHERE code IN ('high_reading','doctor_reading') AND enabled")}
    text = reading_text(reading["kind"], reading["value"], reading.get("value2"))
    label = READING_LIMITS[reading["kind"]]["name"]
    if "doctor_reading" in rules:
        create(rules["doctor_reading"], reading["id"], patient, f"{patient['name']} logged a home {label.lower()} of {text}. This crosses the clinic's limit.")
    if "high_reading" in rules:
        create(
            rules["high_reading"], reading["id"], patient,
            f"Your {label.lower()} of {text} is outside the limit set by your clinic. Please contact the clinic today. If you feel unwell, go to the nearest emergency department.",
            f"آپ کی {READING_LIMITS[reading['kind']]['urdu']} ({text}) کلینک کی مقرر کردہ حد سے باہر ہے۔ براہِ کرم آج ہی کلینک سے رابطہ کریں۔ طبیعت خراب ہو تو قریبی ایمرجنسی میں جائیں۔",
        )


def run_rules():
    """Checks every switched-on rule against every patient. Returns the number of new messages."""
    rules = {r["code"]: r for r in query("SELECT * FROM alert_rule WHERE enabled")}
    before = one("SELECT count(*) AS n FROM message")["n"]
    today = config.TODAY
    for p in query("SELECT * FROM patient ORDER BY id"):
        visits = query("SELECT visit_date, visit_time, status FROM visit WHERE patient_id=%s ORDER BY visit_date", (p["id"],))
        booked = [v for v in visits if v["status"] == "scheduled" and v["visit_date"] >= today]
        if "appointment_reminder" in rules:
            for v in booked:
                if v["visit_date"] == today + timedelta(days=1):
                    create(rules["appointment_reminder"], v["visit_date"], p, f"Reminder: your appointment with {config.DOCTOR_NAME} is tomorrow at {v['visit_time']}.", f"یاد دہانی: {config.DOCTOR_NAME} کے ساتھ آپ کی اپائنٹمنٹ کل {v['visit_time']} بجے ہے۔")
        if "checkup_due" in rules and not booked:
            done = [v for v in visits if v["status"] == "completed"]
            if done and (today - done[-1]["visit_date"]).days > CHECKUP_DAYS:
                create(rules["checkup_due"], done[-1]["visit_date"], p, "Your regular checkup is due. Please contact the clinic to book a time, or reply BOOK.", "آپ کے باقاعدہ معائنے کا وقت ہو گیا ہے۔ وقت لینے کے لیے کلینک سے رابطہ کریں یا BOOK لکھ کر جواب دیں۔")
        if "test_due" in rules:
            for m in missing_records(p["id"]):
                test = LAB_TESTS[m["code"]]["name"]
                create(rules["test_due"], f"{m['code']}:{m['last_seen']}", p, f"Your {test} test is due. Please get it done and bring the report to the clinic, or reply BOOK.", f"آپ کا {test} ٹیسٹ کروانے کا وقت ہو گیا ہے۔ براہِ کرم ٹیسٹ کروا کر رپورٹ کلینک لائیں یا BOOK لکھ کر جواب دیں۔")
        missed = query("SELECT dose_date FROM medicine_dose WHERE patient_id=%s AND NOT taken AND dose_date BETWEEN %s AND %s GROUP BY dose_date", (p["id"], today - timedelta(days=3), today - timedelta(days=1)))
        if len(missed) >= 2:
            key = today.isoformat()
            if "missed_doses" in rules:
                create(rules["missed_doses"], key, p, "Some medicine doses were not ticked in the last few days. Please take your medicine as your doctor advised.", "پچھلے چند دنوں میں کچھ خوراکوں پر نشان نہیں لگا۔ براہِ کرم دوا ڈاکٹر کی ہدایت کے مطابق لیں۔")
            if "family_alert" in rules and p.get("family_name"):
                create(rules["family_alert"], key, p, f"{p['name']} may have missed some medicine doses this week. Please check in with them.", f"ہو سکتا ہے {p['name']} نے اس ہفتے دوا کی کچھ خوراکیں نہ لی ہوں۔ براہِ کرم ان سے پوچھ لیں۔", recipient=p.get("family_phone"))
        if "doctor_result" in rules:
            for f in query("SELECT id, label, value_num, unit, normal_range, fact_date FROM fact WHERE patient_id=%s AND fact_type='lab' AND status IN ('verified','corrected') AND fact_date>=%s", (p["id"], today - timedelta(days=RECENT_RESULT_DAYS))):
                if outside_range(f["value_num"], f["normal_range"]):
                    create(rules["doctor_result"], f["id"], p, f"{p['name']}: {f['label']} is {f['value_num']:g} {f['unit']} (normal {f['normal_range']}). Please review.")
    created = one("SELECT count(*) AS n FROM message")["n"] - before
    if created:
        log_run("Auto Alerts", f"Checked all patients and created {created} messages")
    return created


def adherence(patient_id):
    """Share of past doses ticked in the 14 days before today."""
    r = one(
        "SELECT count(*) AS total, count(*) FILTER (WHERE taken) AS taken FROM medicine_dose WHERE patient_id=%s AND dose_date BETWEEN %s AND %s",
        (patient_id, config.TODAY - timedelta(days=14), config.TODAY - timedelta(days=1)),
    )
    return round(100 * r["taken"] / r["total"]) if r["total"] else None
