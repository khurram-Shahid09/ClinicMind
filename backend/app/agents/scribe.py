"""Scribe agent. Turns dictation into drafts, and code stops any medicine the doctor did not say."""
from .. import ai
from ..reference import medicine_key

PROMPT = """Listen to this doctor's dictation. Return only JSON:
{"transcript":"exact words spoken",
"note":{"complaint":"","findings":"","plan":""},
"prescription":[{"name":"","dose":"","frequency":"","duration":""}],
"uncertain_terms":["words you could not hear clearly"]}
Rules:
- Use only what was said. Never add a medicine, dose, finding or advice.
- Leave a field empty when it was not said.
- Put a medicine in prescription only if the doctor is prescribing or continuing it."""


def from_audio(audio, mime):
    return ai.generate_json("scribe", PROMPT, [(audio, mime)])


def not_in_transcript(prescription, transcript):
    """Medicines in the draft that the doctor did not say."""
    said = (transcript or "").lower()
    return [m.get("name") for m in prescription if (m.get("name") or "").lower() not in said and medicine_key(m.get("name")) not in said and not m.get("edited_by_doctor")]
