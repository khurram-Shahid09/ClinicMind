# 6. API spec

Base path: `/api/v1`. The demo runs locally with one built-in doctor, so there is no sign-in.

**Before real use:** Real accounts and access control are required. See [Safety and privacy](10-safety-and-privacy.md).

## Patients and records

| Method | Path | Purpose | Feature |
|---|---|---|---|
| GET | `/today` | Today's patients and briefs | W3 |
| GET | `/patients` | List patients | R1 |
| GET | `/patients/{id}` | Full patient record, changes, trends and alerts | R1, R3, R4, R5, R6, W2 |
| GET | `/patients/{id}/replay` | Replay script | W1 |
| POST | `/patients/{id}/ask` | Ask a sourced question | W7 |

## Sources

| Method | Path | Purpose | Feature |
|---|---|---|---|
| GET | `/sources/{fact_id}` | Page and highlight box for a fact | W5 |
| GET | `/documents/{id}/image` | Page image | W5 |

**Example response**

```json
{
  "fact_id": 31,
  "label": "Hemoglobin",
  "value": "11.9",
  "unit": "g/dL",
  "status": "verified",
  "date": "2026-10-28",
  "image_url": "/api/v1/documents/10/image",
  "box": { "x": 0.09, "y": 0.27, "w": 0.65, "h": 0.02 }
}
```

Box values are fractions of the page size, so they work at any zoom level.

## Uploads

| Method | Path | Purpose | Feature |
|---|---|---|---|
| POST | `/uploads` | Upload files and start processing | R2 |
| POST | `/uploads/sample` | Process the 20 sample files | R2 |
| GET | `/uploads/{id}/events` | Live steps (SSE) | W4, W6 |

## Needs checking

| Method | Path | Purpose | Feature |
|---|---|---|---|
| GET | `/review-items` | Open items | R7, W6 |
| POST | `/review-items/{id}/resolve` | Correct, reject or attach | R7, W6 |

**Example request**

```json
{ "action": "correct", "value": "500 mg" }
```

## Visit documents

| Method | Path | Purpose | Feature |
|---|---|---|---|
| POST | `/visits/{id}/dictation` | Upload audio, or use the sample if none is sent | D1, D2 |
| GET | `/visits/{id}/drafts` | Drafts, with safety alerts | D1, D2, D3 |
| PATCH | `/drafts/{id}` | Edit a draft | D1, D2 |
| POST | `/drafts/{id}/approve` | Approve a draft | All drafts |
| POST | `/drafts/{id}/patient-instructions` | Urdu sheet from an approved prescription | D4 |
| POST | `/patients/{id}/documents` | Referral letter or certificate | D5 |

Approval returns `409 Conflict` if an allergy alert is unresolved or a medicine was not dictated. Patient instructions also return `409` until the prescription is approved.

## Follow-ups, daily work and activity

| Method | Path | Purpose | Feature |
|---|---|---|---|
| GET | `/follow-ups` | Overdue items and reminder drafts | R8 |
| GET | `/wrap-up/today` | End-of-Day Wrap-Up | D6 |
| GET | `/activity` | Activity log | R9 |

## Demo

| Method | Path | Purpose |
|---|---|---|
| GET | `/status` | Demo date, doctor name and open checks |
| POST | `/demo/reset` | Return to the starting point |
| GET | `/demo/sample-audio` | Sample dictation audio |
