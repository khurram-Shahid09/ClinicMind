"""Loads the made-up demo patients. The hero patient's files go through the real AI pipeline."""
import json
import secrets
from datetime import date, timedelta

from . import config, reference
from .agents import brief
from .db import Jsonb, connect, init_schema, log_run, one, query, run
from .pipeline import load_folder, process_files
from .services import automation

HERO_VISITS = ["2021-11-15", "2023-03-18", "2024-10-20", "2025-10-20", "2026-03-06", "2026-08-20"]
TABLES = "access_log, share_link, previsit, queue_entry, home_reading, medicine_dose, message, alert_rule, board_event, agent_run, draft, brief, review_item, fact, document, batch, visit, patient"


def reset():
    init_schema()
    with connect() as c:
        c.execute(f"TRUNCATE {TABLES} RESTART IDENTITY CASCADE")
    labels = json.loads((config.DEMO_DATA / "patients/hero-labels.json").read_text(encoding="utf-8"))
    hero = labels["hero"]
    hero_id = one("INSERT INTO patient (mrn, name, dob, sex, phone) VALUES (%s,%s,%s,%s,%s) RETURNING id", (hero["mrn"], hero["name"], hero["dob"], hero["sex"], "0300-0000000"))["id"]
    for v in HERO_VISITS:
        run("INSERT INTO visit (patient_id, visit_date, reason) VALUES (%s,%s,%s)", (hero_id, v, "Diabetes and blood pressure review"))
    run("INSERT INTO visit (patient_id, visit_date, visit_time, reason, status) VALUES (%s,%s,%s,%s,'scheduled')", (hero_id, config.TODAY, "09:00", "Sore throat, routine review"))

    for o in json.loads((config.DEMO_DATA / "patients/other-patients.json").read_text(encoding="utf-8")):
        _load_other(o)

    batch = one("INSERT INTO batch (file_count) VALUES (20) RETURNING id")["id"]
    process_files(batch, load_folder(config.DEMO_DATA / "documents/rashid-mehmood"))
    run("DELETE FROM board_event")
    run("DELETE FROM batch")
    _seed_connected()


def _load_other(o):
    pid = one("INSERT INTO patient (mrn, name, dob, sex, phone) VALUES (%s,%s,%s,%s,%s) RETURNING id", (o["mrn"], o["name"], o["dob"], o["sex"], "0300-0000000"))["id"]
    run("INSERT INTO visit (patient_id, visit_date, reason) VALUES (%s,%s,%s)", (pid, "2026-05-10", "Routine review"))
    run("INSERT INTO visit (patient_id, visit_date, visit_time, reason, status) VALUES (%s,%s,%s,%s,'scheduled')", (pid, config.TODAY, o["time"], o["reason"]))
    src = config.DEMO_DATA / "documents/other-patients" / o["file"]
    img = config.STORAGE / "pages" / o["file"]
    img.parent.mkdir(parents=True, exist_ok=True)
    img.write_bytes(src.read_bytes())
    doc = one("INSERT INTO document (patient_id, file_name, sha, image_path, doc_type, doc_date, text_content, search) VALUES (%s,%s,%s,%s,'lab_report',%s,'',to_tsvector('simple','')) RETURNING id", (pid, o["file"], o["mrn"], str(img), o["date"]))["id"]
    boxes = {b["key"]: b["box_2d"] for b in o["boxes"]}
    for i, lab in enumerate(o["labs"]):
        code = reference.lab_code(lab[0])
        run(
            "INSERT INTO fact (patient_id, document_id, fact_type, code, label, value_text, value_num, unit, normal_range, fact_date, box, confidence, status, original_value) VALUES (%s,%s,'lab',%s,%s,%s,%s,%s,%s,%s,%s,1,'verified',%s)",
            (pid, doc, code, lab[0], lab[1], float(lab[1]), lab[2], lab[3], o["date"], Jsonb(boxes.get(f"lab:{i}")), lab[1]),
        )
    brief.make_brief(pid, use_ai=False)


def _seed_connected():
    """Made-up patient activity for the portal, alerts and waiting room."""
    automation.seed_rules()
    for p in query("SELECT id FROM patient"):
        run("UPDATE patient SET portal_token=%s, emergency_token=%s WHERE id=%s", (secrets.token_urlsafe(12), secrets.token_urlsafe(12), p["id"]))
    run("UPDATE patient SET family_name='Sana Mehmood', family_phone='0300-0000001', family_opt_in=TRUE WHERE mrn='CM-1042'")
    run("UPDATE patient SET whatsapp_opt_in=FALSE WHERE mrn='CM-1093'")
    run("UPDATE patient SET whatsapp_opt_in=FALSE, sms_opt_in=FALSE WHERE mrn='CM-1119'")

    # Two more patients who are not on today's list, for the checkup and appointment alerts.
    naveed = one("INSERT INTO patient (mrn, name, dob, sex, phone) VALUES ('CM-1130','Naveed Akhtar','1970-04-11','Male','0300-0000002') RETURNING id")["id"]
    run("INSERT INTO visit (patient_id, visit_date, reason) VALUES (%s,'2026-06-02','Blood pressure review')", (naveed,))
    hina = one("INSERT INTO patient (mrn, name, dob, sex, phone) VALUES ('CM-1141','Hina Tariq','1988-08-23','Female','0300-0000003') RETURNING id")["id"]
    run("INSERT INTO visit (patient_id, visit_date, reason) VALUES (%s,'2026-08-30','Routine review')", (hina,))
    run("INSERT INTO visit (patient_id, visit_date, visit_time, reason, status) VALUES (%s,%s,'11:15','Routine review','scheduled')", (hina, config.TODAY + timedelta(days=1)))
    for pid in (naveed, hina):
        run("UPDATE patient SET portal_token=%s, emergency_token=%s WHERE id=%s", (secrets.token_urlsafe(12), secrets.token_urlsafe(12), pid))

    hero = one("SELECT id FROM patient WHERE mrn='CM-1042'")["id"]
    plan = {"metformin": ["morning", "evening"], "amlodipine": ["morning"], "atorvastatin": ["night"]}
    missed = {(1, "evening"), (2, "evening"), (2, "night"), (6, "night")}
    for back in range(1, 15):
        day = config.TODAY - timedelta(days=back)
        for med, slots in plan.items():
            for slot in slots:
                run("INSERT INTO medicine_dose (patient_id, medicine, dose_date, slot, taken) VALUES (%s,%s,%s,%s,%s)", (hero, med, day, slot, (back, slot) not in missed))
    # An appointment tomorrow for an SMS-only patient and for one who said no to messages.
    for mrn in ("CM-1093", "CM-1119"):
        pid = one("SELECT id FROM patient WHERE mrn=%s", (mrn,))["id"]
        run("INSERT INTO visit (patient_id, visit_date, visit_time, reason, status) VALUES (%s,%s,'10:00','Routine review','scheduled')", (pid, config.TODAY + timedelta(days=1)))
    bp = [(132, 84), (136, 86), (134, 82), (140, 88), (138, 86), (142, 88), (144, 90)]
    for i, (a, b) in enumerate(bp):
        run("INSERT INTO home_reading (patient_id, kind, value, value2, reading_date) VALUES (%s,'bp',%s,%s,%s)", (hero, a, b, config.TODAY - timedelta(days=len(bp) - i)))

    fatima = one("SELECT id FROM patient WHERE mrn='CM-1088'")
    for back, value in ((3, 168), (2, 182), (1, 176)):
        run("INSERT INTO home_reading (patient_id, kind, value, reading_date) VALUES (%s,'sugar',%s,%s)", (fatima["id"], value, config.TODAY - timedelta(days=back)))
    for n, (mrn, status) in enumerate((("CM-1077", "with_doctor"), ("CM-1013", "waiting"), ("CM-1088", "waiting")), 1):
        v = one("SELECT v.id, v.patient_id FROM visit v JOIN patient p ON p.id=v.patient_id WHERE p.mrn=%s AND v.visit_date=%s", (mrn, config.TODAY))
        run("INSERT INTO queue_entry (visit_id, patient_id, token_no, status) VALUES (%s,%s,%s,%s)", (v["id"], v["patient_id"], n, status))


if __name__ == "__main__":
    reset()
    print("patients", one("SELECT count(*) AS n FROM patient")["n"], "facts", one("SELECT count(*) AS n FROM fact")["n"], "open checks", one("SELECT count(*) AS n FROM review_item WHERE status='open'")["n"])
    for r in query("SELECT r.item_type, r.reason, d.file_name FROM review_item r JOIN document d ON d.id=r.document_id"):
        print(" -", r["file_name"], r["item_type"], r["reason"][:90])
