# ClinicMind

**AI agents that turn scattered patient records into a verified brief before the doctor sees the patient.**

A doctor clicks **Replay** and watches five years of a patient's records play out in 30 seconds on a 3D body. The replay pauses on a slow change that is easy to miss when reports are read one at a time. One click opens the original scanned reports with the exact values highlighted.

> **Status:** Working demo. All 22 version 1 features are built.
>
> **Demo only:** This is a portfolio project that uses made-up patients. It is not a medical device, does not diagnose or recommend treatment, and must not be used with real patients in its current form.
>
> **Name notice:** This project is independent and is not affiliated with ClinicMind, the US healthcare software company.

## What it does

- **Reads messy records:** Separates, reads and structures scanned reports and prescriptions.
- **Checks its own work:** Verifies each value against the source and sends doubtful items for human review.
- **Finds what changed:** Uses code to calculate lab trends, medicine changes and missing records.
- **Prepares the doctor:** Writes a Morning Clinic Brief for each patient on today's list.
- **Reduces daily paperwork:** Drafts notes, prescriptions, Urdu instructions, letters and an end-of-day list, all for the doctor to approve.

## Documentation

| # | Document | What it covers |
|---|---|---|
| 1 | [Product overview](docs/01-product-overview.md) | Problem, users, competitors and value |
| 2 | [Feature list](docs/02-feature-list.md) | All 22 version 1 features and what is out of scope |
| 3 | [Agent design](docs/03-agent-design.md) | The 11 agents, workflow and approval points |
| 4 | [Architecture](docs/04-architecture.md) | Tech stack, system design and key technical decisions |
| 5 | [Data model](docs/05-data-model.md) | Database tables and relationships |
| 6 | [API spec](docs/06-api-spec.md) | Backend endpoints and live events |
| 7 | [Screens](docs/07-screens.md) | Each screen and what it shows |
| 8 | [Demo script](docs/08-demo-script.md) | The full demo, step by step, with backups |
| 9 | [Demo data](docs/09-demo-data.md) | The made-up patients and documents |
| 10 | [Safety and privacy](docs/10-safety-and-privacy.md) | Product rules and requirements before real use |
| 11 | [Evaluation](docs/11-evaluation.md) | Measured accuracy and its limits |
| 12 | [Build plan](docs/12-build-plan.md) | What was built, what changed and what's next |

## Run it

You need Docker Desktop.

```bash
docker compose up --build
```

Then open <http://localhost:3000>. The demo starts from saved AI results, so it needs no API key. To process new files or ask new questions, copy `.env.example` to `.env` and add a Gemini API key.

The **Reset** button returns the demo to its starting point.

## Measured results

On 21 pages of made-up documents, ClinicMind read 25 of 25 lab values correctly and placed all 25 highlights on the correct row. It attached no file to the wrong patient, and sent the smudged dose and blurred photo to a person. This is a small test on made-up data and doesn't prove real-world accuracy. See [Evaluation](docs/11-evaluation.md).

## Tech stack

React, TypeScript, Three.js, Python, FastAPI, PostgreSQL, the Gemini API and Docker. See [Architecture](docs/04-architecture.md) for details.

## Project structure

```text
ClinicMind/
├── docs/                 Product and technical documentation
├── frontend/             React web app
├── backend/
│   ├── app/
│   │   ├── agents/       The AI helpers
│   │   └── services/     Non-AI logic: trends, replay, alerts
│   └── tests/            Backend tests
├── demo-data/
│   ├── patients/         Made-up patient records and correct answers
│   ├── documents/        Made-up scanned reports and prescriptions
│   ├── audio/            Sample doctor dictation
│   └── cache/            Saved AI results
└── scripts/              Document generator and demo video recorder
```
