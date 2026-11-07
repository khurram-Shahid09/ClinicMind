# scripts

| File | Purpose |
|---|---|
| `demo-records.mjs` | The made-up patients and their records |
| `generate-documents.mjs` | Creates the messy document images |
| `make_audio.py` | Creates the sample dictation and video narration |
| `record-demo.mjs` | Drives the app and records the demo video |
| `narration.json` | The first video's script |
| `record-demo-2.mjs` | Records the second video, on patient and clinic features |
| `make_audio_2.py` | Creates the second video's narration and the Urdu read-aloud audio |
| `narration-2.json` | The second video's script |
| `record-demo-short.mjs` | Records the short demo. Start the API with `SAVED_STEP_DELAY=0.06` first. |
| `narration-short.json` | The short demo's script |

Run `npm install` here first. Use `node record-demo.mjs --dry` to test the demo without recording it. The app must be running.

Run `node make_poster.mjs` after recording the short demo to create a clean thumbnail.
