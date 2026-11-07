"""Reference data for the demo. A qualified doctor must review all of this before it is relied on."""
import re

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


# Limits for home readings. A doctor must set these for each clinic.
READING_LIMITS = {
    "bp": {"name": "Blood pressure", "urdu": "بلڈ پریشر کی ریڈنگ", "high": 180, "high2": 110, "low": 80, "min": 50, "max": 300},
    "sugar": {"name": "Blood sugar", "urdu": "شوگر کی ریڈنگ", "high": 300, "low": 70, "min": 15, "max": 900},
}

# Plain words for the patient page.
LAB_MEANING = {
    "hb": {"en": "Carries oxygen in your blood.", "ur": "خون میں آکسیجن پہنچاتا ہے۔"},
    "hba1c": {"en": "Shows your average blood sugar over about 3 months.", "ur": "تقریباً 3 مہینوں کی اوسط شوگر بتاتا ہے۔"},
    "creatinine": {"en": "Helps show how well your kidneys are working.", "ur": "گردوں کے کام کے بارے میں بتاتا ہے۔"},
    "glucose": {"en": "Your blood sugar after not eating.", "ur": "خالی پیٹ شوگر کی مقدار۔"},
}


def outside_range(value, normal_range):
    m = re.match(r"\s*([\d.]+)\s*-\s*([\d.]+)", normal_range or "")
    return bool(m and value is not None and not float(m.group(1)) <= value <= float(m.group(2)))


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
