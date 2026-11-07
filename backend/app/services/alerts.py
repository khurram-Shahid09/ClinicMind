"""Record Safety Alerts. Code compares the prescription with the patient's record.

This only covers recorded allergies and duplicates for medicines on the demo list.
No alert does not mean a prescription is safe.
"""
from ..db import query
from ..reference import MEDICINES, medicine_key

TRUSTED = "status IN ('verified','corrected')"


def check_prescription(patient_id, prescription):
    allergies = query(f"SELECT id, label, value_text FROM fact WHERE patient_id=%s AND fact_type='allergy' AND {TRUSTED}", (patient_id,))
    current = query(f"SELECT id, label, value_text FROM fact WHERE patient_id=%s AND fact_type='medicine' AND {TRUSTED} ORDER BY fact_date", (patient_id,))
    alerts = []
    for med in prescription:
        key = medicine_key(med.get("name"))
        cls = MEDICINES.get(key, {}).get("class")
        for a in allergies:
            allergen = a["label"].strip().lower()
            if allergen in (key, cls):
                detail = f" ({a['value_text']})" if a["value_text"] else ""
                alerts.append({"type": "allergy", "blocking": True, "medicine": med.get("name"), "fact_id": a["id"],
                               "text": f"{med.get('name')} is in the {cls} group. This patient has a recorded {a['label']} allergy{detail}."})
        latest = {medicine_key(c["label"]): c for c in current}.get(key)
        if latest and medicine_key(latest["label"]) == key and (latest["value_text"] or "").replace(" ", "").lower() != (med.get("dose") or "").replace(" ", "").lower():
            alerts.append({"type": "duplicate", "blocking": False, "medicine": med.get("name"), "fact_id": latest["id"],
                           "text": f"{latest['label']} {latest['value_text']} is already on record. Please confirm the dose."})
    return alerts
