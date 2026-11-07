"""Patient Match agent. Code only: a file is attached automatically only when two identifiers match exactly."""
from difflib import SequenceMatcher

from ..db import query


def _norm(s):
    return " ".join((s or "").lower().split())


def match(file_no, name, dob=None):
    patients = query("SELECT id, mrn, name, dob FROM patient")
    fn = _norm(file_no)
    nm = _norm(name)
    for p in patients:
        if fn and fn == _norm(p["mrn"]) and nm == _norm(p["name"]):
            return {"patient_id": p["id"], "certain": True, "candidates": []}
    scored = sorted(((SequenceMatcher(None, nm, _norm(p["name"])).ratio(), p) for p in patients), key=lambda x: -x[0])
    candidates = [{"id": p["id"], "name": p["name"], "mrn": p["mrn"]} for s, p in scored[:2] if s > 0.6]
    return {"patient_id": None, "certain": False, "candidates": candidates}
