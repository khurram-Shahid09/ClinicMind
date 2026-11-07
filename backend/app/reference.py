"""Reference data for the demo. A qualified doctor must review all of this before it is relied on."""

# watch: the direction worth flagging. threshold: smallest total change that counts as a slow change.
LAB_TESTS = {
    "hb": {"name": "Hemoglobin", "aliases": ["hemoglobin", "haemoglobin", "hb", "hgb"], "unit": "g/dL", "min": 3, "max": 25, "watch": "down", "threshold": 1.5, "region": "blood", "region_label": "Blood"},
    "hba1c": {"name": "HbA1c", "aliases": ["hba1c", "a1c", "glycated hemoglobin"], "unit": "%", "min": 3, "max": 20, "watch": "up", "threshold": 1.0, "region": "pancreas", "region_label": "Blood sugar"},
    "creatinine": {"name": "Creatinine", "aliases": ["creatinine", "serum creatinine"], "unit": "mg/dL", "min": 0.1, "max": 20, "watch": "up", "threshold": 0.4, "region": "kidneys", "region_label": "Kidneys"},
    "glucose": {"name": "Fasting Glucose", "aliases": ["fasting glucose", "fbs", "fasting blood sugar", "glucose"], "unit": "mg/dL", "min": 20, "max": 800, "watch": "up", "threshold": 60, "region": "pancreas", "region_label": "Blood sugar"},
}

MEDICINES = {
    "metformin": {"brands": ["glucophage"], "class": "biguanide"},
    "amlodipine": {"brands": ["norvasc"], "class": "calcium channel blocker"},
    "atorvastatin": {"brands": ["lipitor"], "class": "statin"},
    "ibuprofen": {"brands": ["brufen"], "class": "nsaid"},
    "paracetamol": {"brands": ["panadol"], "class": "analgesic"},
    "amoxicillin": {"brands": ["amoxil"], "class": "penicillin"},
    "co-amoxiclav": {"brands": ["augmentin"], "class": "penicillin"},
    "azithromycin": {"brands": ["zithromax"], "class": "macrolide"},
    "cefixime": {"brands": ["cefspan"], "class": "cephalosporin"},
}

# Overdue rules: test code, longest gap in days, condition keyword it applies to.
FOLLOW_UP_RULES = [
    {"code": "hba1c", "max_days": 180, "condition": "diabetes"},
]

CONDITION_REGIONS = {"blood pressure": "heart", "hypertension": "heart", "diabetes": "pancreas"}


def lab_code(name):
    n = (name or "").strip().lower()
    for code, t in LAB_TESTS.items():
        if n in t["aliases"]:
            return code
    return None


def medicine_key(name):
    n = (name or "").strip().lower()
    for key, m in MEDICINES.items():
        if n == key or n in m["brands"]:
            return key
    return n
