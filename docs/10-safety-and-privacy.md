# 10. Safety and privacy

## Product status

ClinicMind version 1 is a portfolio demo. It uses made-up patients, is not a medical device, and has not been clinically validated. The app must show this clearly.

## Product rules

| # | Rule | How it is enforced |
|---|---|---|
| 1 | ClinicMind never diagnoses or suggests treatment | Agent instructions, restricted outputs and test cases |
| 2 | The doctor makes all medical decisions | Approval is required for clinical drafts |
| 3 | Every fact links to its source | Code rejects facts and answers without valid source references |
| 4 | Missing data is shown as missing | Separate "not found" states, never implied normal results |
| 5 | Unverified data is not treated as fact | Trends, briefs and alerts use only verified or corrected values |
| 6 | Prescriptions contain only what the doctor dictated | Code compares the draft with the transcript |
| 7 | "No alert" never implies safety | Required text on the prescription screen |
| 8 | Trends do not state causes | AI receives calculated values only, and wording is tested |
| 9 | No patient message is sent in version 1 | No sending service is connected |
| 10 | Text inside documents cannot instruct agents | Documents are treated as data, and tools are limited by code |

## Main risks

| Risk | Possible harm | Control |
|---|---|---|
| Document matched to the wrong patient | Wrong history and wrong decisions | Two-identifier rule and human confirmation |
| Misread lab value or dose | False trend or wrong record | Verification, plausible ranges and review queue |
| Wrong unit | False trend | Unit conversion table, with unknown units sent to review |
| AI invents a fact | False belief about the patient | Source checks and rejection of unknown references |
| Doctor over-trusts the summary | Missed information | Source links and clear limits |
| Misheard drug name | Wrong prescription draft | Uncertain terms are marked, and approval is required |
| Too many alerts | Important alerts are ignored | Only record-based alerts and conservative trend rules |
| A trend looks like a diagnosis | Unnecessary worry or wrong conclusion | Neutral wording and "for doctor review" labels |

## Demo data handling

- Use only synthetic data in this repository and hosted demo.
- Keep API keys in local environment settings, never in code.
- Do not upload real patient files to the public demo.

## Requirements before any real patient data

All of these are required first:

1. **Legal review:** Advice on Pakistani health and data protection rules, consent, record retention and regulatory status.
2. **Patient consent:** A clear process that explains that an external AI service may process documents.
3. **Vendor review:** Check data handling and retention terms for AI and hosting providers. The free Gemini tier used in this demo must not receive real patient data.
4. **Access control:** Real user accounts, role-based access and session limits.
5. **Protection:** Encryption in transit and at rest, backups, and a tested incident plan.
6. **Audit:** A complete record of access and changes.
7. **Clinical testing:** Accuracy testing on approved real-world samples, with doctor supervision.
8. **Security testing:** An independent security review.

## Limits of current knowledge

Pakistani legal and regulatory requirements have not yet been reviewed for this project. A qualified lawyer and regulatory adviser must do this before any real use.

The medical thresholds, lab ranges, medicine list and demo stories must be reviewed by a qualified doctor.
