"""Creates the Urdu read-aloud audio and the narration for the second demo video."""
import json
import time
import wave
from pathlib import Path

from google import genai
from google.genai import errors, types

ROOT = Path(__file__).resolve().parent.parent
KEY = next(l.split("=", 1)[1].strip() for l in (ROOT / ".env").read_text().splitlines() if l.startswith("GEMINI_API_KEY="))
MODELS = ["gemini-3.8-flash-lite-tts", "gemini-2.5-flash-preview-tts", "gemini-3.8-flash-tts", "gemini-3.1-flash-tts-preview"]
URDU = "دوا کیسے لیں۔ میٹفارمن پانچ سو ملی گرام، دن میں دو بار، صبح اور شام لیں۔ ایملوڈیپین پانچ ملی گرام، دن میں ایک بار، صبح لیں۔ ایٹورواسٹیٹن دس ملی گرام، دن میں ایک بار، رات کو لیں۔"
client = genai.Client(api_key=KEY, http_options=types.HttpOptions(api_version="v1beta"))
dead = set()


def speak(text, voice, style, out):
    if out.exists():
        return
    for attempt in range(12):
        usable = [m for m in MODELS if m not in dead]
        if not usable:
            raise SystemExit(f"All voice models are at their daily limit. Stopped at {out.name}.")
        model = usable[attempt % len(usable)]
        try:
            r = client.models.generate_content(
                model=model,
                contents=f"{style}: {text}",
                config=types.GenerateContentConfig(
                    response_modalities=["AUDIO"],
                    speech_config=types.SpeechConfig(voice_config=types.VoiceConfig(prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name=voice))),
                ),
            )
            pcm = r.candidates[0].content.parts[0].inline_data.data
            out.parent.mkdir(parents=True, exist_ok=True)
            with wave.open(str(out), "wb") as w:
                w.setnchannels(1)
                w.setsampwidth(2)
                w.setframerate(24000)
                w.writeframes(pcm)
            print("ok", out.name, model, flush=True)
            time.sleep(7)
            return
        except errors.APIError as e:
            if e.code == 429 and "PerDay" in str(e):
                dead.add(model)
            print("retry", out.name, model, e.code, flush=True)
            time.sleep(4 if model in dead else 22)
        except (TypeError, AttributeError, IndexError):
            print("retry empty", out.name, model, flush=True)
            time.sleep(5)
    raise SystemExit(f"Could not create {out.name}")


speak(URDU, "Kore", "Read this slowly and clearly in Urdu, for an older patient", ROOT / "demo-data/audio/urdu-instructions.wav")
for name, text in json.loads((ROOT / "scripts/narration-2.json").read_text(encoding="utf-8")).items():
    speak(text, "Kore", "Narrate warmly and clearly at a calm pace, for a product demo video", ROOT / f"demo-video/audio2/{name}.wav")
print("done")
