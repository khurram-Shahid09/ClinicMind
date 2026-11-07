"""Loads the made-up demo patients. The hero patient's files go through the real AI pipeline."""
import json
from datetime import date

from . import config, reference
from .agents import brief
from .db import Jsonb, connect, init_schema, log_run, one, query, run
from .pipeline import load_folder, process_files

HERO_VISITS = ["2021-11-15", "2023-03-18", "2024-10-20", "2025-10-20", "2026-03-06", "2026-08-20"]
TABLES = "board_event, agent_run, draft, brief, review_item, fact, document, batch, visit, patient"


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


if __name__ == "__main__":
    reset()
    print("patients", one("SELECT count(*) AS n FROM patient")["n"], "facts", one("SELECT count(*) AS n FROM fact")["n"], "open checks", one("SELECT count(*) AS n FROM review_item WHERE status='open'")["n"])
    for r in query("SELECT r.item_type, r.reason, d.file_name FROM review_item r JOIN document d ON d.id=r.document_id"):
        print(" -", r["file_name"], r["item_type"], r["reason"][:90])
