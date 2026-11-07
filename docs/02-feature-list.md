# 2. Feature list

Version 1 has **22 features**. Each one must appear in the demo unless marked as a backup or stretch item in the [build plan](12-build-plan.md).

## Signature features

| ID | Feature | What it does |
|---|---|---|
| W1 | **Patient Story Replay** | Plays a patient's visits, lab trends and medicines over 30 seconds on a 3D body, then pauses on the most important change |
| W2 | **Hidden Trend Finder** | Uses code to detect slow changes across several reports and links to every source report |
| W3 | **Morning Clinic Brief** | Prepares a short verified brief for each patient on today's list |
| W4 | **Live Agent Board** | Shows each agent processing uploaded files in real time |
| W5 | **Click-to-Source** | Opens the original scan with the matching line highlighted |
| W6 | **Self-Checking AI** | Rechecks extracted values and sends doubtful items for review instead of guessing |
| W7 | **Ask in Urdu** | Answers questions in Urdu, Roman Urdu or English, with sources |

## Patient record features

| ID | Feature | What it does |
|---|---|---|
| R1 | **Patient profile and timeline** | Shows visits, documents, conditions, allergies and key events in date order |
| R2 | **Bulk upload** | Accepts many PDFs and images at once and separates them into documents |
| R3 | **Lab trend charts** | Charts each lab value over time, using consistent units |
| R4 | **Medicine change history** | Shows when each medicine or dose started, changed or stopped according to the records |
| R5 | **What Changed Since Last Visit** | Lists new medicines, changed values and new documents |
| R6 | **Missing-record alerts** | Flags missing information, such as "No HbA1c on file for 8 months" |
| R7 | **Review queue** | Collects uncertain patient matches and values for a person to confirm or correct |
| R8 | **Follow-up drafts** | Finds overdue items and drafts reminders for the doctor to approve |
| R9 | **Agent activity log** | Records what each agent did, when, and who approved it |

## Daily workflow features

| ID | Feature | What it does |
|---|---|---|
| D1 | **Voice Visit Notes** | Turns the doctor's dictation into a structured note to approve |
| D2 | **Prescription Draft** | Turns dictated medicines into a clean, printable prescription |
| D3 | **Record Safety Alerts** | Warns about a recorded allergy match or a duplicate of a current medicine |
| D4 | **Urdu Patient Instructions** | Turns the approved prescription and advice into a simple Urdu sheet |
| D5 | **One-Click Documents** | Drafts referral letters and medical certificates from the record |
| D6 | **End-of-Day Wrap-Up** | Lists unsigned notes, abnormal reports to review and tomorrow's follow-ups |

## Automation flow

```text
Report uploaded → Patient matched → Data extracted → Data verified
→ Timeline updated → Changes found → Brief ready
```

The flow pauses only when an agent is unsure or a draft needs approval.

## Out of scope for version 1

- Diagnosis or treatment suggestions
- Appointments, billing and pharmacy
- Live WhatsApp or SMS sending (drafts only)
- Use with real patient data
- Integration with hospital or laboratory systems
- Urdu handwriting recognition

## Planned for version 2

- **Patients Like This:** Finds similar patients from the doctor's own practice and shows what was recorded for them. It is postponed because it needs many past records and small numbers could be misread as proof.
- **Live WhatsApp:** Report intake and approved messages through the official WhatsApp Business service.
