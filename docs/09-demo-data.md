# 9. Demo data

All patients, documents and clinics are made up. Every generated document carries the mark **SYNTHETIC - DEMO DATA**, and no real patient information is used.

## Contents

| Item | Amount |
|---|---|
| Patients | 8 |
| Patients on today's list | 8 |
| Hero patient upload set | 20 files |
| Accuracy test pages | The same 21 pages, with known correct answers |

The demo uses diabetes and high blood pressure, because almost everyone understands them.

## Hero patient: Rashid Mehmood

| Field | Value |
|---|---|
| **Age and sex** | 58, male |
| **Conditions** | Type 2 diabetes and hypertension |
| **Allergy** | Penicillin |
| **Record span** | 5 years |

### Planned findings

| Finding | Details | Used in |
|---|---|---|
| **Hidden trend** | Hemoglobin: 14.2, 13.8, 13.3, 12.9, 12.4, 11.9 g/dL across 6 reports over 3 years | Replay, sources |
| **Recent lab change** | Creatinine: 1.2 to 1.4 mg/dL since the last visit | Brief, Urdu answer |
| **New medicine** | A painkiller appears on the latest outside prescription | What Changed, brief |
| **Doubtful value** | Handwritten metformin dose could read 500 mg or 800 mg, and the correct value is 500 mg | Review queue |
| **Missing record** | No HbA1c on file for 8 months | Brief, follow-up draft |
| **Allergy conflict** | The dictated prescription includes amoxicillin | Safety alert |

The app shows these findings without suggesting a cause. A doctor must confirm that the story is realistic and that the values are appropriate before the demo.

## The 20-file upload set

| Type | Count | Quality variations |
|---|---|---|
| Printed lab reports | 10 | Clean scans, skew, shadows and creases |
| Handwritten-style prescriptions | 5 | Mixed legibility |
| Discharge or specialist summaries | 2 | Printed, two pages |
| Multi-document PDF | 1 | Several reports in one file |
| Another patient's report | 1 | Must trigger a patient-match review |
| Unreadable photo | 1 | Must go to review |

## How the documents are created

`scripts/generate-documents.mjs` is a generator that:

1. Reads made-up records from `scripts/demo-records.mjs`.
2. Renders reports from HTML templates for made-up laboratories.
3. Adds scan effects, such as skew, noise, shadows and creases.
4. Saves the correct values and their positions in `demo-data/patients/` for accuracy testing.

Handwriting fonts are only a stand-in. For a truer test, a person can hand-write synthetic prescriptions and photograph them.

## File layout

```text
demo-data/
├── patients/                 Structured records and expected values
└── documents/
    └── rashid-mehmood/       Hero patient upload set

evals/datasets/
├── documents/                Accuracy test documents
└── labels.json               Correct answers
```

## Rules

- Never add real patient files to this repository.
- Use made-up names, phone numbers, ID numbers, clinics and laboratories.
- Use documents from real people only in a separate private test, with written permission.
