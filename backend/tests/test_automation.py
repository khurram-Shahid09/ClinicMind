from app.reference import outside_range
from app.services.automation import choose_channel, is_high, reading_text


def test_whatsapp_is_used_first():
    assert choose_channel({"phone": "0300", "whatsapp_opt_in": True, "sms_opt_in": True}) == "whatsapp"


def test_sms_is_the_fallback():
    assert choose_channel({"phone": "0300", "whatsapp_opt_in": False, "sms_opt_in": True}) == "sms"


def test_no_message_without_agreement():
    assert choose_channel({"phone": "0300", "whatsapp_opt_in": False, "sms_opt_in": False}) is None


def test_no_message_without_a_phone():
    assert choose_channel({"phone": None, "whatsapp_opt_in": True}) is None


def test_high_blood_pressure_is_flagged():
    assert is_high("bp", 188, 112)
    assert is_high("bp", 150, 112)
    assert not is_high("bp", 138, 86)


def test_sugar_limits_cover_high_and_low():
    assert is_high("sugar", 320)
    assert is_high("sugar", 60)
    assert not is_high("sugar", 140)


def test_reading_text():
    assert reading_text("bp", 188, 112) == "188/112 mmHg"
    assert reading_text("sugar", 140) == "140 mg/dL"


def test_outside_range():
    assert outside_range(11.9, "13.0-17.0")
    assert not outside_range(14.2, "13.0-17.0")
    assert not outside_range(14.2, None)
