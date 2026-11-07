import asyncio
import json
import re
import threading
import time
from collections import defaultdict
from datetime import date

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel

from . import ai, config, pipeline, seed
from .agents import ask as ask_agent
from .agents import brief as brief_agent
from .agents import change, daily_ops, documents, followup, scribe, verification
from .agents.reader import read_page
from .db import Jsonb, init_schema, log_run, one, query, run
from .patient_api import router as patient_router
from .services import alerts, automation, replay, trends

app = FastAPI(title="ClinicMind API")
app.include_router(patient_router)
api = "/api/v1"
TRUSTED = "status IN ('verified','corrected')"
state = {"seeding": False, "error": None}


def _reset():
    state.update(seeding=True, error=None)
    try:
        seed.reset()
    except Exception as e:
        state["error"] = str(e)[:300]
        raise
    finally:
        state["seeding"] = False


def _alert_loop():
    """Checks the alert rules on a timer, so nobody has to press a button."""
    while True:
        time.sleep(config.AUTOMATION_INTERVAL * 60)
        if state["seeding"]:
            continue
        try:
            automation.run_rules()
        except Exception as e:
            print("Alert check failed:", e, flush=True)


@app.on_event("startup")
def startup():
    init_schema()
    if not one("SELECT id FROM patient LIMIT 1"):
        threading.Thread(target=_reset, daemon=True).start()
    if config.AUTOMATION_INTERVAL > 0:
        threading.Thread(target=_alert_loop, daemon=True).start()


@app.get(api + "/status")
def status():
    alerts_count = one("SELECT count(*) AS n FROM message WHERE audience='doctor' AND status='new'") if not state["seeding"] else {"n": 0}
    return {**state, "today": config.TODAY.isoformat(), "doctor": config.DOCTOR_NAME, "open_checks": one("SELECT count(*) AS n FROM review_item WHERE status='open'")["n"], "doctor_alerts": alerts_count["n"]}


@app.post(api + "/demo/reset")
def demo_reset():
    if state["seeding"]:
        raise HTTPException(409, "Already resetting")
    _reset()
    return {"ok": True}


@app.get(api + "/demo/urdu-instructions-audio")
def urdu_audio():
    return FileResponse(config.DEMO_DATA / "audio/urdu-instructions.wav", media_type="audio/wav")


@app.get(api + "/demo/sample-audio")
def sample_audio():
    return FileResponse(config.DEMO_DATA / "audio/sample-dictation.wav", media_type="audio/wav")


def _age(dob):
    return config.TODAY.year - dob.year - ((config.TODAY.month, config.TODAY.day) < (dob.month, dob.day))


def _person(p):
    return {**p, "dob": p["dob"].isoformat(), "age": _age(p["dob"])}


@app.get(api + "/today")
def today():
    rows = query("SELECT v.id AS visit_id, v.visit_time, v.reason, v.status, p.* FROM visit v JOIN patient p ON p.id=v.patient_id WHERE v.visit_date=%s ORDER BY v.visit_time", (config.TODAY,))
    out = []
    for r in rows:
        b = brief_agent.get_brief(r["id"])
        queue = one("SELECT token_no, status FROM queue_entry WHERE visit_id=%s", (r["visit_id"],))
        previsit = one("SELECT symptoms, note, question FROM previsit WHERE visit_id=%s", (r["visit_id"],))
        out.append({**_person(r), "brief": b, "alerts": change.missing_records(r["id"]), "has_trend": bool(trends.hidden_trends(r["id"])), "queue": queue, "previsit": previsit})
    return out


@app.get(api + "/patients")
def patients():
    return [_person(p) for p in query("SELECT * FROM patient ORDER BY name")]


@app.get(api + "/patients/{pid}")
def patient(pid: int):
    p = one("SELECT * FROM patient WHERE id=%s", (pid,))
    if not p:
        raise HTTPException(404, "Patient not found")
    facts = query(f"SELECT id, fact_type, code, label, value_text, value_num, unit, normal_range, frequency, fact_date::text AS date, status FROM fact WHERE patient_id=%s ORDER BY fact_date, id", (pid,))
    trusted = [f for f in facts if f["status"] in ("verified", "corrected")]
    labs = defaultdict(list)
    for f in trusted:
        if f["fact_type"] == "lab" and f["code"]:
            labs[f["code"]].append(f)
    latest_meds = {}
    for f in trusted:
        if f["fact_type"] == "medicine":
            latest_meds[f["code"]] = f
    timeline = query("SELECT id, file_name, doc_type, doc_date::text AS date FROM document WHERE patient_id=%s AND doc_date IS NOT NULL ORDER BY doc_date DESC", (pid,))
    visit = one("SELECT id, reason, visit_time FROM visit WHERE patient_id=%s AND visit_date=%s", (pid, config.TODAY))
    unique = lambda t: list({f["label"].lower(): f for f in trusted if f["fact_type"] == t}.values())
    conditions = unique("condition")
    # "Diabetes" adds nothing when "Type 2 diabetes" is also on record.
    conditions = [c for c in conditions if not any(c is not o and c["label"].lower() in o["label"].lower() for o in conditions)]
    return {
        **_person(p),
        "visit": visit,
        "conditions": conditions,
        "allergies": unique("allergy"),
        "medicines": list(latest_meds.values()),
        "medicine_history": [f for f in facts if f["fact_type"] == "medicine"],
        "labs": labs,
        "timeline": timeline,
        "changes": change.changes_since_last_visit(pid),
        "missing": change.missing_records(pid),
        "trends": trends.hidden_trends(pid),
        "brief": brief_agent.get_brief(pid),
        "pending": sum(f["status"] == "needs_review" for f in facts),
    }


@app.get(api + "/patients/{pid}/replay")
def patient_replay(pid: int):
    return replay.build(pid)


@app.get(api + "/sources/{fact_id}")
def source(fact_id: int):
    f = one("SELECT f.*, d.id AS doc_id, d.file_name, d.doc_date::text AS doc_date_text FROM fact f JOIN document d ON d.id=f.document_id WHERE f.id=%s", (fact_id,))
    if not f:
        raise HTTPException(404, "Source not found")
    b = f["box"]
    return {
        "fact_id": fact_id, "label": f["label"], "value": f["value_text"], "unit": f["unit"], "status": f["status"], "original_value": f["original_value"],
        "file_name": f["file_name"], "date": f["doc_date_text"], "image_url": f"{api}/documents/{f['doc_id']}/image",
        "box": {"y": b[0] / 1000, "x": b[1] / 1000, "h": (b[2] - b[0]) / 1000, "w": (b[3] - b[1]) / 1000} if b else None,
    }


@app.get(api + "/documents/{doc_id}/image")
def document_image(doc_id: int):
    d = one("SELECT image_path FROM document WHERE id=%s", (doc_id,))
    if not d:
        raise HTTPException(404, "Document not found")
    return FileResponse(d["image_path"], media_type="image/jpeg")


def _start_batch(files):
    batch = one("INSERT INTO batch (file_count) VALUES (%s) RETURNING id", (len(files),))["id"]
    threading.Thread(target=pipeline.process_files, args=(batch, files), daemon=True).start()
    return {"batch_id": batch, "file_count": len(files)}


@app.post(api + "/uploads")
async def upload(files: list[UploadFile] = File(...)):
    return _start_batch([(f.filename, await f.read()) for f in files])


@app.post(api + "/uploads/sample")
def upload_sample():
    return _start_batch(pipeline.load_folder(config.DEMO_DATA / "documents/rashid-mehmood"))


@app.get(api + "/uploads/{batch_id}/events")
async def upload_events(batch_id: int):
    async def stream():
        last = 0
        while True:
            rows = await asyncio.to_thread(query, "SELECT id, file_name, agent, status, message FROM board_event WHERE batch_id=%s AND id>%s ORDER BY id", (batch_id, last))
            for r in rows:
                last = r["id"]
                yield f"data: {json.dumps(r)}\n\n"
            b = await asyncio.to_thread(one, "SELECT status, saved_run FROM batch WHERE id=%s", (batch_id,))
            if not b or (b["status"] != "running" and not rows):
                yield f"event: end\ndata: {json.dumps(b)}\n\n"
                return
            await asyncio.sleep(0.2)
    return StreamingResponse(stream(), media_type="text/event-stream", headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


@app.get(api + "/review-items")
def review_items():
    rows = query("""SELECT r.*, d.file_name, d.id AS doc_id, d.doc_date::text AS doc_date, f.label, f.value_text, f.frequency, f.box
                    FROM review_item r JOIN document d ON d.id=r.document_id LEFT JOIN fact f ON f.id=r.fact_id
                    WHERE r.status='open' ORDER BY r.id""")
    return [{**r, "image_url": f"{api}/documents/{r['doc_id']}/image"} for r in rows]


class Resolve(BaseModel):
    action: str
    value: str | None = None
    patient_id: int | None = None


@app.post(api + "/review-items/{item_id}/resolve")
def resolve(item_id: int, body: Resolve):
    r = one("SELECT * FROM review_item WHERE id=%s AND status='open'", (item_id,))
    if not r:
        raise HTTPException(404, "This item is already resolved")
    label = one("SELECT file_name FROM document WHERE id=%s", (r["document_id"],))["file_name"]
    patient_id = None
    if r["fact_id"]:
        f = one("SELECT * FROM fact WHERE id=%s", (r["fact_id"],))
        patient_id = f["patient_id"]
        if body.action == "correct":
            if not body.value:
                raise HTTPException(422, "Enter the correct value")
            run("UPDATE fact SET status='corrected', value_text=%s, value_num=COALESCE(%s, value_num) WHERE id=%s", (body.value, verification._num(body.value) if f["fact_type"] == "lab" else None, f["id"]))
            summary = f"{label}: {f['label']} confirmed as {body.value}"
        elif body.action == "reject":
            run("UPDATE fact SET status='rejected' WHERE id=%s", (f["id"],))
            summary = f"{label}: {f['label']} removed from the record"
        else:
            raise HTTPException(422, "Unknown action")
    elif r["item_type"] == "patient_match" and body.action == "attach":
        patient_id = body.patient_id
        doc = one("SELECT * FROM document WHERE id=%s", (r["document_id"],))
        image = open(doc["image_path"], "rb").read()
        data, _ = read_page(image)
        second, _ = verification.second_read(image)
        d = verification.valid_date(data.get("doc_date"))
        run("UPDATE document SET patient_id=%s, doc_date=%s, status='processed' WHERE id=%s", (patient_id, d, doc["id"]))
        pipeline.save_facts(doc["id"], patient_id, data, second, d)
        summary = f"{label}: attached by a person after checking"
    else:
        run("UPDATE document SET status='rejected' WHERE id=%s", (r["document_id"],))
        summary = f"{label}: kept out of the patient's record"
    run("UPDATE review_item SET status='resolved', resolved_value=%s, resolved_at=now() WHERE id=%s", (body.value or body.action, item_id))
    log_run("Needs checking", summary, patient_id, r["document_id"], actor=config.DOCTOR_NAME)
    if patient_id:
        try:
            brief_agent.make_brief(patient_id)
        except ai.AIUnavailable:
            brief_agent.make_brief(patient_id, use_ai=False)
    return {"ok": True, "summary": summary}


class Question(BaseModel):
    question: str


@app.post(api + "/patients/{pid}/ask")
def ask(pid: int, q: Question):
    try:
        return ask_agent.ask(pid, q.question)
    except ai.AIUnavailable:
        raise HTTPException(503, "The AI service is busy. Please try again in a minute.")


def _make_drafts(visit, data, saved):
    pid = visit["patient_id"]
    for med in data.get("prescription") or []:
        med["name"] = (med.get("name") or "").strip().capitalize()
    run("DELETE FROM draft WHERE visit_id=%s AND draft_type IN ('visit_note','prescription')", (visit["id"],))
    note = one("INSERT INTO draft (patient_id, visit_id, draft_type, content, transcript) VALUES (%s,%s,'visit_note',%s,%s) RETURNING id", (pid, visit["id"], Jsonb(data.get("note") or {}), data.get("transcript")))
    rx = one("INSERT INTO draft (patient_id, visit_id, draft_type, content, transcript) VALUES (%s,%s,'prescription',%s,%s) RETURNING id", (pid, visit["id"], Jsonb({"medicines": data.get("prescription") or [], "uncertain_terms": data.get("uncertain_terms") or []}), data.get("transcript")))
    log_run("Scribe", "Drafted a visit note and prescription from dictation", pid, saved=saved)
    return note["id"], rx["id"]


@app.post(api + "/visits/{visit_id}/dictation")
async def dictation(visit_id: int, audio: UploadFile | None = File(None)):
    visit = one("SELECT * FROM visit WHERE id=%s", (visit_id,))
    if not visit:
        raise HTTPException(404, "Visit not found")
    if audio:
        data, mime = await audio.read(), (audio.content_type or "audio/webm").split(";")[0]
    else:
        data, mime = (config.DEMO_DATA / "audio/sample-dictation.wav").read_bytes(), "audio/wav"
    try:
        result, saved = await asyncio.to_thread(scribe.from_audio, data, mime)
    except ai.AIUnavailable:
        raise HTTPException(503, "The AI service is busy. Please try again in a minute.")
    _make_drafts(visit, result, saved)
    return visit_drafts(visit_id)


def _rx_state(rx):
    meds = rx["content"].get("medicines", [])
    unsaid = scribe.not_in_transcript(meds, rx["transcript"])
    found = alerts.check_prescription(rx["patient_id"], meds)
    return {"alerts": found, "not_dictated": unsaid}


@app.get(api + "/visits/{visit_id}/drafts")
def visit_drafts(visit_id: int):
    rows = query("SELECT * FROM draft WHERE visit_id=%s ORDER BY id", (visit_id,))
    for r in rows:
        if r["draft_type"] == "prescription":
            r.update(_rx_state(r))
    return rows


class DraftEdit(BaseModel):
    content: dict


@app.patch(api + "/drafts/{draft_id}")
def edit_draft(draft_id: int, body: DraftEdit):
    d = one("SELECT * FROM draft WHERE id=%s", (draft_id,))
    if not d:
        raise HTTPException(404, "Draft not found")
    if d["status"] == "approved":
        raise HTTPException(409, "An approved draft cannot be edited")
    run("UPDATE draft SET content=%s WHERE id=%s", (Jsonb(body.content), draft_id))
    log_run("Scribe", f"Doctor edited the {d['draft_type'].replace('_', ' ')}", d["patient_id"], actor=config.DOCTOR_NAME)
    d = one("SELECT * FROM draft WHERE id=%s", (draft_id,))
    if d["draft_type"] == "prescription":
        d.update(_rx_state(d))
    return d


class Approve(BaseModel):
    override_reason: str | None = None


@app.post(api + "/drafts/{draft_id}/approve")
def approve(draft_id: int, body: Approve):
    d = one("SELECT * FROM draft WHERE id=%s", (draft_id,))
    if not d:
        raise HTTPException(404, "Draft not found")
    if d["draft_type"] == "prescription":
        s = _rx_state(d)
        if s["not_dictated"]:
            raise HTTPException(409, f"Not dictated by the doctor: {', '.join(s['not_dictated'])}")
        if any(a["blocking"] for a in s["alerts"]) and not (body.override_reason or "").strip():
            raise HTTPException(409, "Resolve the allergy alert before approval.")
    run("UPDATE draft SET status='approved', approved_at=now() WHERE id=%s", (draft_id,))
    log_run("Approval", f"Doctor approved the {d['draft_type'].replace('_', ' ')}" + (f". Reason given: {body.override_reason}" if body.override_reason else ""), d["patient_id"], actor=config.DOCTOR_NAME)
    return {"ok": True}


def _store_doc(pid, visit_id, kind, content, saved):
    d = one("INSERT INTO draft (patient_id, visit_id, draft_type, content) VALUES (%s,%s,%s,%s) RETURNING *", (pid, visit_id, kind, Jsonb(content)))
    log_run("Document", f"Drafted a {kind.replace('_', ' ')}", pid, saved=saved)
    return d


@app.post(api + "/drafts/{draft_id}/patient-instructions")
def instructions(draft_id: int):
    rx = one("SELECT * FROM draft WHERE id=%s AND draft_type='prescription'", (draft_id,))
    if not rx or rx["status"] != "approved":
        raise HTTPException(409, "Approve the prescription first")
    note = one("SELECT content FROM draft WHERE visit_id=%s AND draft_type='visit_note'", (rx["visit_id"],))
    try:
        content, saved = documents.patient_instructions(rx["content"].get("medicines", []), (note or {"content": {}})["content"].get("plan", ""))
    except ai.AIUnavailable:
        raise HTTPException(503, "The AI service is busy. Please try again in a minute.")
    return _store_doc(rx["patient_id"], rx["visit_id"], "patient_instructions", content, saved)


class DocRequest(BaseModel):
    kind: str
    to: str | None = None
    reason: str | None = None
    days: int | None = None
    visit_id: int | None = None


@app.post(api + "/patients/{pid}/documents")
def patient_document(pid: int, body: DocRequest):
    try:
        if body.kind == "referral_letter":
            content, saved = documents.referral_letter(pid, body.to, body.reason)
        elif body.kind == "medical_certificate":
            content, saved = documents.medical_certificate(pid, body.days or 1, body.reason or "Seen in clinic")
        else:
            raise HTTPException(422, "Unknown document type")
    except ai.AIUnavailable:
        raise HTTPException(503, "The AI service is busy. Please try again in a minute.")
    return _store_doc(pid, body.visit_id, body.kind, content, saved)


@app.get(api + "/follow-ups")
def follow_ups():
    try:
        followup.refresh()
    except ai.AIUnavailable:
        pass
    return followup.list_all()


@app.get(api + "/wrap-up/today")
def wrap_up():
    return daily_ops.wrap_up()


@app.get(api + "/activity")
def activity(patient_id: int | None = None):
    if patient_id:
        return query("SELECT a.*, p.name FROM agent_run a LEFT JOIN patient p ON p.id=a.patient_id WHERE a.patient_id=%s ORDER BY a.id DESC LIMIT 200", (patient_id,))
    return query("SELECT a.*, p.name FROM agent_run a LEFT JOIN patient p ON p.id=a.patient_id ORDER BY a.id DESC LIMIT 200")
