import os
from datetime import date
from pathlib import Path

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://clinicmind:clinicmind@localhost:5432/clinicmind")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
# Free-tier limits are per model, so the app moves down this list when one is used up.
GEMINI_MODELS = [m.strip() for m in os.getenv("GEMINI_MODELS", "gemini-3.5-flash-lite,gemini-3.1-flash-lite,gemini-3.6-flash,gemini-3.8-flash,gemini-3.7-flash").split(",")]
DEMO_DATA = Path(os.getenv("DEMO_DATA_PATH", "demo-data"))
STORAGE = Path(os.getenv("STORAGE_PATH", "storage"))
TODAY = date.fromisoformat(os.getenv("DEMO_TODAY", "2026-11-09"))
DOCTOR_NAME = os.getenv("DOCTOR_NAME", "Dr. Ahmed Raza")

# Seconds between live AI calls, to stay inside free-tier limits.
AI_MIN_INTERVAL = float(os.getenv("AI_MIN_INTERVAL", "5"))
# Seconds per step when replaying a saved run on the Agent Board.
SAVED_STEP_DELAY = float(os.getenv("SAVED_STEP_DELAY", "0.22"))
CACHE_DIR = DEMO_DATA / "cache"
