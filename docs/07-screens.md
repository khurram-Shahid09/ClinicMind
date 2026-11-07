# 7. Screens

The app is a desktop-first web app with a light, clinical look. Tablets are supported. Every screen with data shows a **Demo data** label.

| # | Screen | Purpose | Features |
|---|---|---|---|
| 1 | Today | Clinic list and briefs | W3, R6 |
| 2 | Patient profile | One patient's full record | R1, R3, R4, R5, R6 |
| 3 | Patient Story Replay | Visual history | W1, W2 |
| 4 | Source viewer | Original document with highlight | W5 |
| 5 | Upload and Agent Board | Live processing | R2, W4, W6 |
| 6 | Review queue | Resolve doubtful items | R7, W6 |
| 7 | Ask panel | Sourced questions and answers | W7 |
| 8 | Visit workspace | Dictation and drafts | D1, D2, D3, D4, D5 |
| 9 | Follow-ups | Approve reminder drafts | R8 |
| 10 | End-of-Day Wrap-Up | Pending work | D6 |
| 11 | Activity log | Agent history | R9 |

## 1. Today

- Today's patient list, with appointment time and status
- Each row shows one key change, an alert count and a brief status
- Opening a row expands the brief, with a source link for every fact

## 2. Patient profile

- **Header:** Name, age, conditions, allergies and current medicines
- **Top card:** What Changed Since Last Visit
- **Main area:** Timeline, lab trend charts and medicine history
- **Side area:** Missing-record alerts, Ask panel and a **Replay** button

Values waiting for review are marked and left out of trends.

## 3. Patient Story Replay

- **Center:** 3D body with highlighted regions
- **Bottom:** Timeline with play, pause, speed and drag controls
- **Side:** Lab charts drawing over time and medicines starting or stopping
- **Pause moment:** Hidden Trend card with values, dates and a **View sources** button

**Required text:** "Highlighted regions show where a test relates to the body. They do not show disease."

## 4. Source viewer

- Original page image with the source line highlighted
- Zoom, page controls and a list of all source reports for a trend
- The extracted value next to the source text
- An "Approximate location" label when exact positions are unavailable

## 5. Upload and Agent Board

- Drag-and-drop area for many files
- One column per agent, with document cards moving across in real time
- Counters for processed, verified and needs review
- A timeline that fills in as records are verified

## 6. Review queue

- Each item shows the scan crop, extracted value and reason for review
- Actions: **Confirm**, **Correct** and **Reject**
- Patient-match items show the document's details next to candidate patients
- Resolving an item updates the timeline and trends

## 7. Ask panel

- Text box that accepts Urdu, Roman Urdu or English, with optional voice input
- Answers appear in the question's language, with source chips
- Clear "Not found in this patient's record" state
- A note saying ClinicMind reports records and does not give medical advice

## 8. Visit workspace

- Dictate or select the backup recording
- Transcript, with uncertain terms highlighted
- Tabs for note, prescription, Urdu instructions and letter or certificate
- Safety alerts shown above the prescription, with **Change** and **Continue with reason** actions
- **Approve** remains disabled until blocking checks are resolved
- **Required text:** "No alert does not mean this prescription is safe."

## 9. Follow-ups

- Overdue items, with the rule that triggered each one
- Editable reminder draft
- **Approve** and **Dismiss** actions
- Label: "Version 1 does not send messages"

## 10. End-of-Day Wrap-Up

- Unsigned notes
- Abnormal reports waiting for review
- Tomorrow's follow-ups
- Open review items
- One-click link to each item

## 11. Activity log

- Filter by patient, agent or status
- Each row shows the time, action, result and approver
- Opens to show input references and the agent's output

## Language display

Urdu text uses a right-to-left layout with a suitable Urdu font. Medical test names stay in their common English form when that is clearer.
