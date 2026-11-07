from app.agents.ask import is_urdu_script
from app.agents.verification import check_lab, check_medicine

BOX = [100, 100, 200, 900]
LAB = {"test": "Hemoglobin", "value": "14.2", "unit": "g/dL", "box_2d": BOX, "confidence": 0.99}
SECOND = {"labs": [{"test": "Hemoglobin", "value": "14.2"}]}


def test_matching_lab_is_verified():
    assert check_lab(LAB, SECOND) is None


def test_second_reading_mismatch_needs_checking():
    assert "second reading" in check_lab(LAB, {"labs": [{"test": "Hemoglobin", "value": "11.2"}]})


def test_impossible_value_needs_checking():
    assert "out of range" in check_lab({**LAB, "value": "142"}, SECOND)


def test_wrong_unit_needs_checking():
    assert "unit" in check_lab({**LAB, "unit": "g/L"}, SECOND)


def test_low_confidence_needs_checking():
    assert "not confident" in check_lab({**LAB, "confidence": 0.5}, SECOND)


def test_missing_box_needs_checking():
    assert "locate" in check_lab({**LAB, "box_2d": None}, SECOND)


def test_doubtful_medicine_needs_checking():
    med = {"name": "Metformin", "dose": "500 mg", "box_2d": BOX, "confidence": 0.5, "doubt": "Smudged digit"}
    assert check_medicine(med, {"medicines": []}) == "Smudged digit"


def test_clear_medicine_is_verified():
    med = {"name": "Ibuprofen", "dose": "400 mg", "box_2d": BOX, "confidence": 0.98, "doubt": None}
    assert check_medicine(med, {"medicines": [{"name": "Ibuprofen", "dose": "400 mg"}]}) is None


def test_urdu_script_check():
    assert is_urdu_script("پچھلی وزٹ کے بعد Creatinine")
    assert not is_urdu_script("पिछली visit के बाद")
    assert not is_urdu_script("Pichli visit ke baad")
