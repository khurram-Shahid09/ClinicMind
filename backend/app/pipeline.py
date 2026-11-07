"""Runs uploaded files through the agents and records each step for the Agent Board."""
import hashlib
import io
import time
from pathlib import Path

import pypdfium2
from PIL import Image

from . import ai, config, reference
from .agents import brief, patient_match, reader, verification
from .db import Jsonb, log_run, one, run


def event(batch_id, file_name, agent, status, message=""):
    if batch_id:
        run("INSERT INTO board_event (batch_id, file_name, agent, status, message) VALUES (%s,%s,%s,%s,%s)", (batch_id, file_name, agent, status, message))


def file_pages(name, data):
    """Returns the pages of a file as JPEG bytes."""
    if name.lower().endswith(".pdf"):
        pdf = pypdfium2.PdfDocument(data)
        pages = []
        for page in pdf:
            buf = io.BytesIO()
            page.render(scale=1.5).to_pil().convert("RGB").save(buf, "JPEG", quality=80)
            pages.append(buf.getvalue())
        return pages
    img = Image.open(io.BytesIO(data))
    if img.format == "JPEG":
        return [data]
    buf = io.BytesIO()
    img.convert("RGB").save(buf, "JPEG", quality=85)
    return [buf.getvalue()]


def _doc_label(file_name, pages, number):
    return file_name if pages == 1 else f"{file_name} (page {number})"


def _pace(saved):
    if saved and config.SAVED_STEP_DELAY:
        time.sleep(config.SAVED_STEP_DELAY)


def add_fact(doc_id, patient_id, fact_type, label, date, status, reason=None, **kw):
    row = one(
        """INSERT INTO fact (patient_id, document_id, fact_type, code, label, value_text, value_num, unit, normal_range, frequency, fact_date, box, confidence, status, original_value, reason)
           VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id""",
        (patient_id, doc_id, fact_type, kw.get("code"), label, kw.get("value_text"), kw.get("value_num"), kw.get("unit"), kw.get("normal_range"), kw.get("frequency"), date, Jsonb(kw.get("box")), kw.get("confidence"), status, kw.get("value_text"), reason),
    )
    return row["id"]


def _needs_check(doc_id, fact_id, reason, suggested=None, options=None, item_type="value"):
    run(
        "INSERT INTO review_item (item_type, document_id, fact_id, reason, suggested_value, options) VALUES (%s,%s,%s,%s,%s,%s)",
        (item_type, doc_id, fact_id, reason, suggested, Jsonb(options or [])),
    )


def save_facts(doc_id, patient_id, data, second, doc_date):
    verified = doubtful = 0
    for lab in data.get("labs", []):
        reason = verification.check_lab(lab, second)
        code = reference.lab_code(lab.get("test"))
        value = verification._num(lab.get("value"))
        fid = add_fact(doc_id, patient_id, "lab", code and reference.LAB_TESTS[code]["name"] or lab.get("test", "Unknown test"), doc_date, "needs_review" if reason else "verified", reason,
                       code=code, value_text=str(lab.get("value")), value_num=value, unit=lab.get("unit"), normal_range=lab.get("normal_range"), box=lab.get("box_2d"), confidence=lab.get("confidence"))
        if reason:
            doubtful += 1
            _needs_check(doc_id, fid, reason, str(lab.get("value")))
        else:
            verified += 1
    for med in data.get("medicines", []):
        reason = verification.check_medicine(med, second)
        fid = add_fact(doc_id, patient_id, "medicine", med.get("name", "Unknown medicine"), doc_date, "needs_review" if reason else "verified", reason,
                       code=reference.medicine_key(med.get("name")), value_text=med.get("dose"), frequency=med.get("frequency"), box=med.get("box_2d"), confidence=med.get("confidence"))
        if reason:
            doubtful += 1
            _needs_check(doc_id, fid, reason, med.get("dose"), med.get("possible_values") or [])
        else:
            verified += 1
    for al in data.get("allergies", []):
        reason = verification.check_statement(al)
        fid = add_fact(doc_id, patient_id, "allergy", al.get("substance", ""), doc_date, "needs_review" if reason else "verified", reason, value_text=al.get("reaction"), box=al.get("box_2d"), confidence=al.get("confidence"))
        if reason:
            doubtful += 1
            _needs_check(doc_id, fid, reason, al.get("substance"))
        else:
            verified += 1
    for cond in data.get("conditions", []):
        reason = verification.check_statement(cond)
        fid = add_fact(doc_id, patient_id, "condition", cond.get("name", ""), doc_date, "needs_review" if reason else "verified", reason, box=cond.get("box_2d"), confidence=cond.get("confidence"))
        if reason:
            doubtful += 1
            _needs_check(doc_id, fid, reason, cond.get("name"))
        else:
            verified += 1
    return verified, doubtful


def process_page(batch_id, label, file_name, sha, number, image):
    img_dir = config.STORAGE / "pages"
    img_dir.mkdir(parents=True, exist_ok=True)
    image_path = img_dir / f"{sha}-{number}.jpg"
    image_path.write_bytes(image)
    existing = one("SELECT id, patient_id, status FROM document WHERE sha=%s AND page_number=%s", (sha, number))

    event(batch_id, label, "sort", "running", "Reading the page")
    data, saved1 = reader.read_page(image)
    _pace(saved1 and batch_id)
    kind = {"lab_report": "Lab report", "prescription": "Prescription", "summary": "Hospital letter"}.get(data.get("doc_type"), "Unknown file")
    event(batch_id, label, "sort", "done", kind)

    event(batch_id, label, "match", "running", "Finding the patient")
    _pace(saved1 and batch_id)
    if not data.get("readable", True) or not (data.get("patient_name") or data.get("file_no")):
        event(batch_id, label, "match", "needs_review", "Too blurry to read")
        if not existing:
            doc = one("INSERT INTO document (file_name, sha, page_number, image_path, doc_type, status) VALUES (%s,%s,%s,%s,%s,'needs_review') RETURNING id", (file_name, sha, number, str(image_path), data.get("doc_type")))
            _needs_check(doc["id"], None, "This photo is too blurry to read safely. Please take a clearer photo.", item_type="unreadable")
            log_run("Intake", f"{label}: too blurry to read, sent for checking", document_id=doc["id"], status="needs_review", saved=saved1)
        return saved1, None

    m = patient_match.match(data.get("file_no"), data.get("patient_name"), data.get("date_of_birth"))
    if not m["certain"]:
        event(batch_id, label, "match", "needs_review", f"Name on file: {data.get('patient_name')}. Please confirm.")
        if not existing:
            doc = one("INSERT INTO document (file_name, sha, page_number, image_path, doc_type, status) VALUES (%s,%s,%s,%s,%s,'needs_review') RETURNING id", (file_name, sha, number, str(image_path), data.get("doc_type")))
            _needs_check(doc["id"], None, f"This file says \"{data.get('patient_name')}\", file no {data.get('file_no')}. It does not exactly match any patient.", options=m["candidates"], item_type="patient_match")
            log_run("Patient Match", f"{label}: not attached, the patient did not match exactly", document_id=doc["id"], status="needs_review", saved=saved1)
        return saved1, None
    patient_id = m["patient_id"]
    patient = one("SELECT name FROM patient WHERE id=%s", (patient_id,))
    event(batch_id, label, "match", "done", patient["name"])

    count = len(data.get("labs", [])) + len(data.get("medicines", [])) + len(data.get("allergies", [])) + len(data.get("conditions", []))
    event(batch_id, label, "read", "running", "Reading the details")
    _pace(saved1 and batch_id)
    event(batch_id, label, "read", "done", f"Found {count} details")

    event(batch_id, label, "check", "running", "Double-checking")
    second, saved2 = verification.second_read(image)
    _pace(saved2 and batch_id)
    doc_date = verification.valid_date(data.get("doc_date"))
    if existing:
        doubtful = one("SELECT count(*) AS n FROM fact WHERE document_id=%s AND status='needs_review'", (existing["id"],))["n"]
        verified = count - doubtful
    else:
        doc = one(
            "INSERT INTO document (patient_id, file_name, sha, page_number, image_path, doc_type, doc_date, text_content, search) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,to_tsvector('simple',%s)) RETURNING id",
            (patient_id, file_name, sha, number, str(image_path), data.get("doc_type"), doc_date, data.get("text", ""), data.get("text", "")),
        )
        verified, doubtful = save_facts(doc["id"], patient_id, data, second, doc_date)
        log_run("Extraction", f"{label}: found {count} details", patient_id, doc["id"], saved=saved1)
        log_run("Verification", f"{label}: {verified} verified, {doubtful} need checking", patient_id, doc["id"], status="needs_review" if doubtful else "done", saved=saved2)
    if doubtful:
        event(batch_id, label, "check", "needs_review", f"{doubtful} unclear value. Asking a person.")
    else:
        event(batch_id, label, "check", "done", f"{verified} verified")
        event(batch_id, label, "save", "done", "Added to record")
    return saved1 and saved2, patient_id


def process_files(batch_id, files):
    """files is a list of (name, bytes)."""
    all_saved = True
    patients = set()
    try:
        for name, data in files:
            sha = hashlib.sha256(data).hexdigest()[:24]
            pages = file_pages(name, data)
            for i, img in enumerate(pages, 1):
                try:
                    saved, pid = process_page(batch_id, _doc_label(name, len(pages), i), name, sha, i, img)
                except ai.AIUnavailable as e:
                    event(batch_id, name, "sort", "failed", f"AI is not available: {e}")
                    all_saved = False
                    continue
                all_saved = all_saved and saved
                if pid:
                    patients.add(pid)
        for pid in patients:
            event(batch_id, None, "summary", "running", "Preparing the brief")
            b = brief.make_brief(pid)
            event(batch_id, None, "summary", "done", b["headline"])
        run("UPDATE batch SET status='done', saved_run=%s WHERE id=%s", (all_saved, batch_id))
    except Exception as e:
        event(batch_id, None, "summary", "failed", str(e)[:200])
        run("UPDATE batch SET status='failed' WHERE id=%s", (batch_id,))
        raise


def load_folder(folder: Path):
    return [(p.name, p.read_bytes()) for p in sorted(folder.iterdir()) if p.suffix.lower() in (".jpg", ".jpeg", ".png", ".pdf")]
