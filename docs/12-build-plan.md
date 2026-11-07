# 12. Build plan

Each phase ends with something that can be shown. The riskiest parts are tested first.

## Phases

| Phase | Goal | Delivers | Done when |
|---|---|---|---|
| **0. Setup** | Runnable base | Docker, database, backend, frontend and sign-in | One command starts the empty app |
| **1. Risk tests** | Prove the hard parts | OCR, highlighting, extraction, Urdu speech and 3D model tests | Tools are chosen and any change of plan is recorded |
| **2. Demo data** | Realistic test material | Hero patient, 30 patients, generated documents and labels | The upload set and expected answers exist |
| **3. Document pipeline** | Files become verified facts | OCR, Intake, Patient Match, Extraction, Verification and review queue | The upload set produces correct records, and doubtful items go to review |
| **4. Patient record** | Records become useful | Profile, timeline, trends, medicines, Click-to-Source and activity log | Any shown fact can open its highlighted source |
| **5. Insights** | Reveal what matters | Hidden Trend Finder, What Changed, missing-record alerts, briefs and Follow-up Agent | Seeded findings appear, with no invented causes |
| **6. Signature experience** | The wow moment | Patient Story Replay and Live Agent Board | The first 60 seconds of the demo work end to end |
| **7. Ask Agent** | Sourced questions | Search, tools, and Urdu and English answers | The question test set passes its targets |
| **8. Daily workflow** | Reduce paperwork | Dictation, drafts, alerts, Urdu sheet, letters and wrap-up | The visit part of the demo works end to end |
| **9. Evaluation and polish** | Prove and present | Accuracy report, Demo Mode, design polish and demo rehearsal | The full demo runs twice without help |
| **10. Portfolio** | Publish | Hosted demo, video and case study | The project is live on the portfolio |

## Phase 1 risk tests

| Test | Pass condition | If it fails |
|---|---|---|
| OCR line positions on scans | Highlights land on the correct line for printed reports | Try another OCR tool |
| Handwritten-style prescriptions | Uncertain text reliably goes to review | Limit the demo's handwriting claims |
| Urdu and Roman Urdu questions | Correct understanding on test questions | Offer typed input first |
| Dictation with drug names | Drug names are correct or marked uncertain | Use the recording and show marked terms |
| 3D body model | Licensed model runs smoothly with selectable regions | Use the 2D body diagram |
| Cost per document | Measured and acceptable for the demo | Reduce repeat calls, then test a cheaper model |

## Biggest risks

| Risk | Impact | Response |
|---|---|---|
| Scope is large for one builder | Unfinished demo | Finish phases in order, and protect the first 60 seconds |
| Handwriting accuracy | Lower trust | Focus on printed reports, and show the review step honestly |
| 3D model licensing or quality | Weaker wow moment | Check licenses early and keep the 2D fallback |
| Live demo failure | Lost confidence | Demo Mode and tested recordings |
| Medical errors in demo content | Lost credibility | Doctor review before showing it |

## If time runs short

**Keep:** Replay, Hidden Trend, Click-to-Source, upload pipeline and review queue.

**Simplify first:** Voice input to recordings, then the 3D body to 2D, then certificates and follow-up drafts.

These simplifications would change the 22-feature promise, so the feature list must be updated if any are used.

## Open decisions

| Decision | Current default | Needed by |
|---|---|---|
| Target doctor's specialty | Diabetes and kidney care | Phase 2 |
| Doctor to review medical content | To be confirmed | Before Phase 2 ends |
| OCR tool | PaddleOCR | Phase 1 |
| Speech-to-text service | Soniox or Whisper | Phase 1 |
| 3D body asset | To be chosen, subject to license | Phase 1 |
| Hosting | To be chosen | Phase 10 |
| Public product name | ClinicMind, which is also a US healthcare software company | Before public launch |
