"""Creates the sample doctor dictation and the demo video narration with Gemini text-to-speech."""
import json
import sys
import time
import wave
from pathlib import Path

from google import genai
from google.genai import errors, types

ROOT = Path(__file__).resolve().parent.parent
KEY = next(l.split("=", 1)[1].strip() for l in (ROOT / ".env").read_text().splitlines() if l.startswith("GEMINI_API_KEY="))
MODELS = ["gemini-3.1-flash-tts-preview", "gemini-2.5-flash-preview-tts", "gemini-3.8-flash-tts"]
DICTATION = "Patient complains of sore throat for three days. Throat is red, no fever. Prescribe amoxicillin five hundred milligrams, three times a day, for five days. Continue metformin five hundred milligrams, twice a day. Plan: drink warm fluids and come back after two weeks."
client = genai.Client(api_key=KEY, http_options=types.HttpOptions(api_version="v1beta"))


def speak(text, voice, style, out):
    if out.exists():
        return
    prompt = f"{style}: {text}"
    for attempt in range(8):
        model = MODELS[attempt % len(MODELS)]
        try:
            r = client.models.generate_content(
                model=model,
                contents=prompt,
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
            print("retry", out.name, model, e.code, str(e.message)[:80], flush=True)
            time.sleep(25 if e.code == 429 else 5)
    sys.exit(f"Could not create {out.name}")


if __name__ == "__main__":
    speak(DICTATION, "Charon", "Read calmly, like a doctor dictating notes", ROOT / "demo-data/audio/sample-dictation.wav")
    if "--narration" in sys.argv:
        for name, text in json.loads((ROOT / "scripts/narration.json").read_text(encoding="utf-8")).items():
            speak(text, "Kore", "Narrate warmly and clearly at a calm pace, for a product demo video", ROOT / f"demo-video/audio/{name}.wav")
