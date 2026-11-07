# 8. Demo script

**Length:** About 6 minutes. The first 60 seconds can stand alone as a short demo.

**Story:** The hero patient is Rashid Mehmood, a made-up 58-year-old with type 2 diabetes and hypertension. All clinical details must be reviewed by a doctor before the demo.

## Before the demo

- Reset the demo database and confirm that today's briefs are ready.
- Keep the 20-file upload set and backup dictation ready.
- Test the Urdu question and all external services.
- Turn on Demo Mode if the connection is unreliable.
- Say at the start: "Everything here uses made-up patient data."

## The demo

| # | Time | Action | What appears | Say |
|---|---|---|---|---|
| 1 | 0:00 | Open Rashid's profile and click **Replay** | Five years play in 30 seconds on the 3D body | "This is five years of messy paper records." |
| 2 | 0:35 | Replay pauses automatically | Hidden Trend: hemoglobin fell from 14.2 to 11.9 over 3 years across 6 reports | "The trend shows when the reports are compared. ClinicMind flags it for review and doesn't say why it happened." |
| 3 | 0:55 | Click **View sources** | Source reports with the values highlighted | "Every value goes back to its original report." |
| 4 | 1:15 | Open Upload and drop 20 messy files | Live Agent Board runs | "Now here's how it got there. Each agent has one job." |
| 5 | 2:00 | Open the flagged item | Metformin dose may be 500 mg or 850 mg, and the handwriting is unclear | "When it's unsure, it asks instead of guessing." |
| 6 | 2:20 | Correct it to 500 mg and open the activity log | The record updates, and the log shows the correction | "A person makes the final call, and every step is recorded." |
| 7 | 2:35 | Open **Today** | Morning Clinic Brief, with changes and "No HbA1c on file for 8 months" | "This is ready before clinic starts." |
| 8 | 3:00 | Ask **"Pichli visit se kya change hua?"** | Sourced Urdu answer | "The doctor can ask in the language they think in." |
| 9 | 3:20 | Click an answer's source chip | Highlighted report | "The answer is checkable too." |
| 10 | 3:35 | Dictate the visit note and prescription | Note and prescription drafts | "These contain only what the doctor said." |
| 11 | 4:05 | Prescription includes amoxicillin | Allergy alert: penicillin allergy on record | "This compares the prescription with the patient's record." |
| 12 | 4:25 | Doctor changes the medicine and approves | Approved prescription | "The doctor decides what to change." |
| 13 | 4:45 | Click **Urdu instructions** | Printable patient sheet | "The patient leaves with instructions they can read." |
| 14 | 5:05 | Click **Referral letter** | Completed draft from the record | "That's a routine letter drafted in seconds." |
| 15 | 5:25 | Open **Follow-ups** and approve a reminder | Overdue HbA1c reminder is approved | "Nothing goes out without approval." |
| 16 | 5:40 | Open **End-of-Day Wrap-Up** | Pending notes, reports and follow-ups | "The day closes with a clear list of what's left." |

## Closing line

> "ClinicMind doesn't replace the doctor's judgment. It makes sure the doctor sees the patient's full story, with proof, before making a decision."

## Backups

| Failure | Backup |
|---|---|
| Internet or API failure | Demo Mode, with the "Saved run" label shown |
| Speech-to-text mishears | Use the tested recording |
| Slow file processing | Use the saved board run |
| 3D model fails to load | Use the 2D body replay |
| Urdu answer is poor | Use the saved question and answer |

## Likely questions

| Question | Answer |
|---|---|
| **Can it read my handwriting?** | Not reliably yet. Printed reports should work better, and unclear handwriting goes to review. It still needs testing on real samples with permission. |
| **Does it diagnose?** | No. It reports what is in the record, and the doctor makes all medical decisions. |
| **Is it accurate?** | Show the published [evaluation](11-evaluation.md) results. Don't quote a number until it has been measured. |
| **Can I use it with real patients?** | Not yet. See [Safety and privacy](10-safety-and-privacy.md). |
| **Did it save doctors time?** | This hasn't been measured. A clinic pilot would need to test it. |
