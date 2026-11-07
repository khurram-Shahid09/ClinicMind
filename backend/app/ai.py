"""Gemini access with saved results and pacing, so the demo stays inside free-tier limits."""
import hashlib
import json
import threading
import time

from google import genai
from google.genai import errors, types

from . import config

_lock = threading.Lock()
_last_call = 0.0
_client = None
_exhausted = set()


class AIUnavailable(Exception):
    pass


def client():
    global _client
    if _client is None:
        if not config.GEMINI_API_KEY:
            raise AIUnavailable("No Gemini API key is set.")
        _client = genai.Client(api_key=config.GEMINI_API_KEY)
    return _client


def _key(*parts):
    h = hashlib.sha256()
    for p in parts:
        h.update(p if isinstance(p, bytes) else str(p).encode())
    return h.hexdigest()[:32]


def cache_path(name, key):
    return config.CACHE_DIR / name / f"{key}.json"


def load_saved(name, *parts):
    p = cache_path(name, _key(*parts))
    return json.loads(p.read_text(encoding="utf-8")) if p.exists() else None


def save(name, value, *parts):
    p = cache_path(name, _key(*parts))
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(value, ensure_ascii=False, indent=1), encoding="utf-8")


def call(contents, config_obj=None):
    """One live Gemini call, paced. Moves to the next free model when one model's limit is used up."""
    global _last_call
    with _lock:
        last_error = None
        for attempt in range(len(config.GEMINI_MODELS) * 3):
            usable = [m for m in config.GEMINI_MODELS if m not in _exhausted]
            if not usable:
                raise AIUnavailable("The free daily AI limit is used up. Please try again tomorrow.")
            model = usable[attempt % len(usable)]
            wait = config.AI_MIN_INTERVAL - (time.time() - _last_call)
            if wait > 0:
                time.sleep(wait)
            _last_call = time.time()
            try:
                return client().models.generate_content(model=model, contents=contents, config=config_obj)
            except errors.APIError as e:
                last_error = e
                if e.code == 429 and "PerDay" in str(e):
                    _exhausted.add(model)
                elif e.code == 404:
                    _exhausted.add(model)
                elif e.code in (429, 500, 503):
                    time.sleep(10)
                else:
                    raise AIUnavailable(f"Gemini error {e.code}") from e
        raise AIUnavailable(f"Gemini is busy: {str(last_error)[:120]}")


def parse_json(text):
    t = (text or "").strip()
    if t.startswith("```"):
        t = t.split("\n", 1)[1].rsplit("```", 1)[0]
    return json.loads(t)


def generate_json(name, prompt, attachments=()):
    """Returns (result, was_saved). attachments is a list of (bytes, mime_type)."""
    parts = [prompt] + [a[0] for a in attachments]
    saved = load_saved(name, *parts)
    if saved is not None:
        return saved, True
    contents = [types.Part.from_bytes(data=d, mime_type=m) for d, m in attachments] + [prompt]
    last = None
    for _ in range(3):
        r = call(contents, types.GenerateContentConfig(response_mime_type="application/json"))
        try:
            result = parse_json(r.text)
            save(name, result, *parts)
            return result, False
        except (ValueError, TypeError) as e:
            last = e
    raise AIUnavailable(f"Unreadable AI response: {last}")
