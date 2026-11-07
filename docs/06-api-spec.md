# 6. API spec

Base path: `/api/v1`. All endpoints except login require a signed-in user.

## Sign-in

| Method | Path | Purpose |
|---|---|---|
| POST | `/auth/login` | Sign in |
| POST | `/auth/logout` | Sign out |

## Patients and records

| Method | Path | Purpose | Feature |
|---|---|---|---|
| GET | `/patients` | Search or list patients | R1 |
| GET | `/patients/{id}` | Patient profile | R1 |
| GET | `/patients/{id}/timeline` | Visits, documents and key events | R1 |
| GET | `/patients/{id}/labs` | Lab history, optionally by test | R3 |
| GET | `/patients/{id}/medicines` | Medicine history | R4 |
| GET | `/patients/{id}/changes?since=` | Changes since a date or last visit | R5 |
| GET | `/patients/{id}/missing-records` | Missing-record alerts | R6 |
| GET | `/patients/{id}/trends` | Hidden Trend findings | W2 |
| GET | `/patients/{id}/replay` | Replay script | W1 |

## Uploads and processing

| Method | Path | Purpose | Feature |
|---|---|---|---|
| POST | `/uploads` | Upload files and start processing | R2 |
| GET | `/uploads/{id}` | Batch status | R2 |
| GET | `/uploads/{id}/events` | Live agent events (SSE) | W4 |

## Sources

| Method | Path | Purpose | Feature |
|---|---|---|---|
| GET | `/sources?fact_type=&fact_id=` | Page and highlight boxes for a fact | W5 |
| GET | `/documents/{id}/pages/{n}/image` | Page image | W5 |

**Example response**

```json
{
  "document_id": "uuid",
  "page_number": 1,
  "image_url": "/api/v1/documents/uuid/pages/1/image",
  "highlights": [{ "x": 0.12, "y": 0.41, "width": 0.52, "height": 0.03 }],
  "is_approximate": false,
  "cited_text": "Hemoglobin 11.9 g/dL"
}
```

Highlight values are fractions of the page size, so they work at any zoom level.

## Review queue

| Method | Path | Purpose | Feature |
|---|---|---|---|
| GET | `/review-items?status=open` | List review items | R7, W6 |
| POST | `/review-items/{id}/resolve` | Confirm, correct or reject | R7, W6 |

**Example request**

```json
{ "action": "correct", "value": "500 mg" }
```

## Briefs and questions

| Method | Path | Purpose | Feature |
|---|---|---|---|
| GET | `/briefs/today` | Morning Clinic Brief list | W3 |
| GET | `/patients/{id}/brief` | Latest patient brief | W3 |
| POST | `/briefs/generate` | Prepare today's briefs | W3 |
| POST | `/patients/{id}/ask` | Ask a question and stream the answer (SSE) | W7 |

**Example answer**

```json
{
  "answer": "پچھلی وزٹ کے بعد کریٹینین 1.2 سے بڑھ کر 1.4 ہوا ہے۔",
  "claims": [{ "text": "Creatinine 1.2 to 1.4", "fact_type": "lab_result", "fact_id": "uuid" }],
  "not_found": false
}
```

## Visit documents

| Method | Path | Purpose | Feature |
|---|---|---|---|
| POST | `/visits/{id}/dictation` | Upload audio, or select the saved backup recording | D1, D2 |
| GET | `/visits/{id}/drafts` | List drafts | D1, D2 |
| PATCH | `/drafts/{id}` | Edit a draft | D1, D2 |
| POST | `/drafts/{id}/check` | Run prescription checks and safety alerts | D3 |
| POST | `/drafts/{id}/approve` | Approve a draft | All drafts |
| POST | `/drafts/{id}/patient-instructions` | Create Urdu instructions from an approved prescription | D4 |
| POST | `/patients/{id}/documents` | Draft a referral letter or certificate | D5 |
| GET | `/drafts/{id}/print` | Printable version | D2, D4, D5 |

Approval returns `409 Conflict` if a blocking check is unresolved. Requests for patient instructions from an unapproved prescription also return `409`.

## Follow-ups, daily work and activity

| Method | Path | Purpose | Feature |
|---|---|---|---|
| GET | `/follow-ups` | Overdue items and drafts | R8 |
| GET | `/wrap-up/today` | End-of-Day Wrap-Up | D6 |
| GET | `/activity?patient_id=` | Agent activity log | R9 |

## Live event format

```json
{
  "run_id": "uuid",
  "agent": "verification",
  "document_id": "uuid",
  "status": "needs_review",
  "message": "Dose is unclear: 500 mg or 850 mg",
  "at": "2026-11-07T08:30:00Z"
}
```

`status` can be `queued`, `running`, `done`, `needs_review` or `failed`.

## Errors

```json
{ "error": { "code": "blocking_check_unresolved", "message": "Resolve the allergy alert before approval." } }
```
