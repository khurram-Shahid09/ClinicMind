# 12. Build plan

## Status

Two demo videos are complete. All 22 record and daily-work features are built, along with the 16 [connected features](13-connected-features.md).

## What changed from the original plan

| Original plan | What was built | Why |
|---|---|---|
| Claude API | Gemini API free tier | Existing free-tier keys were available |
| Separate OCR tool | Gemini reads text and locates it | Testing showed this was accurate enough on the demo documents and much simpler |
| Separate speech service | Gemini hears the audio | One service is simpler |
| pgvector search | PostgreSQL full-text search | Enough for one patient's documents |
| Licensed 3D body model | A simple body built in code | No license risk, and faster |
| Sign-in | One built-in demo doctor | Not needed for a local demo with made-up data |
| 30 patients | 8 patients | Today's list is enough for the demo |
| 100 test documents | 21 labelled pages | A proper test set is still needed |

## What's next

| Priority | Task |
|---|---|
| 1 | Have a doctor review the demo story, thresholds and medicine list |
| 2 | Add the case study and video to the portfolio |
| 3 | Test with real scans, used only with written permission and without sending them to a free AI tier |
| 4 | Build a larger, separate accuracy test set |
| 5 | Interview practising doctors, and measure whether it saves time |
| 6 | Connect a real WhatsApp or SMS provider, using made-up data until the requirements are met |
| 7 | Add one-time phone codes in place of the birth-year check |
| 8 | Add **Patients Like This** |

## Open decisions

| Decision | Current position |
|---|---|
| Public product name | ClinicMind is also a US healthcare software company, so get advice or rename before any commercial launch |
| Hosting | The demo runs locally |
| Real-patient use | Not allowed until the requirements in [Safety and privacy](10-safety-and-privacy.md) are met |

## Known limits

- The first run of a new file needs a Gemini key and is slow on the free tier, which allowed 20 requests per day per model during the build.
- A medicine with no recorded stop date stays listed under "Medicines on record".
- Printing uses the browser's print view, with no custom print layout.
- The 3D body is a simple illustration, not anatomy for clinical use.
