# 13. Connected features

These features connect the clinic with patients between visits. None of them needs AI, so they keep working when the free AI limit is used up.

## Features

| ID | Feature | What it does |
|---|---|---|
| C1 | **Auto Alerts** | Checks every patient on a timer and creates reminders by rule |
| C2 | **WhatsApp and SMS** | Uses WhatsApp first, then SMS, and sends nothing without the patient's agreement. Delivery is simulated. |
| C3 | **Message hook** | Posts each sent message to a service you choose, such as n8n or Twilio |
| C4 | **Patient QR code** | Opens the patient's own health page, protected by their birth year |
| C5 | **My Health page** | Shows the next visit, results, history and clinic messages in simple English or Urdu |
| C6 | **Urdu read-aloud** | Reads medicine instructions aloud for patients who can't read them |
| C7 | **Medicine ticks** | Patients tick each dose, and the doctor sees the self-reported share |
| C8 | **Home readings** | Patients log blood pressure or sugar, and readings over the limit alert the doctor at once |
| C9 | **Before Your Visit** | Patients send symptoms and a question ahead of time, and chest pain triggers urgent guidance |
| C10 | **QR check-in** | Gives a token, the number of people ahead and an estimated wait |
| C11 | **Waiting room screen** | Updates itself and shows first names only |
| C12 | **Emergency card** | A QR code that shows allergies, conditions, medicines and an emergency contact |
| C13 | **48-hour sharing** | A private link for a second opinion that ends by itself or can be stopped |
| C14 | **Who Opened My Record** | Shows the patient each time their record was opened |
| C15 | **Family helper** | Tells a family member about missed medicine, only if the patient agreed |
| C16 | **Clinic Pulse** | Shows today's patients, waiting, reminders, overdue tests and flagged readings |

## Alert rules

| Rule | Trigger | Goes to | Default |
|---|---|---|---|
| Appointment reminder | Visit booked for tomorrow | Patient | Automatic |
| Test due | Regular test is overdue | Patient | Automatic |
| Checkup due | No visit booked, and the last was over 90 days ago | Patient | Automatic |
| Missed medicine | Doses unticked on 2 of the last 3 days | Patient | Ask first |
| Family helper | Same as missed medicine | Family member | Ask first |
| High home reading | Reading crosses the clinic's limit | Patient | Automatic |
| Doctor alert: home reading | Flagged reading, or chest pain reported before a visit | Doctor | Immediate |
| Doctor alert: new result | Recent result outside the normal range | Doctor only | Immediate |

The clinic can turn each patient rule on or off, and choose automatic or ask first. A rule never sends the same message twice.

**Results are never sent to patients automatically.** A new abnormal result goes to the doctor first.

## Connecting real WhatsApp or SMS

Version 1 simulates delivery, so no real message leaves the app. To connect a real service:

1. Create a WhatsApp Business or SMS provider account, and get approved message templates where required.
2. Build a small flow in n8n, Make, or your own service that receives the message and sends it.
3. Set `ALERT_WEBHOOK_URL` in `.env`.

ClinicMind then posts each patient message as JSON:

```json
{
  "id": 12,
  "rule_code": "test_due",
  "channel": "whatsapp",
  "recipient": "0300-0000000",
  "body_en": "Your HbA1c test is due...",
  "body_ur": "..."
}
```

If the service can't be reached, the message is marked **Failed** and is not shown as delivered. The hook was tested with a local listener, but no real WhatsApp or SMS provider has been connected.

The hook sends health-related text to whichever service you choose, so review it first and use it only with made-up data until the [real-use requirements](10-safety-and-privacy.md) are met.

## Scanning QR codes from a real phone

QR codes use the address in the browser, and `localhost` doesn't work from a phone. To test on a phone on the same Wi-Fi:

1. Find your computer's network address, such as `192.168.1.20`.
2. Set `PUBLIC_URL=http://192.168.1.20:3000` in `.env`, and restart the app.
3. Open the patient page and scan the code.

The patient QR code uses this setting. The emergency and share QR codes use the address the page was opened with, so open the patient page from that same address on the phone.

## What was tested

| Check | Result |
|---|---|
| Patient and emergency QR codes decode to the correct links | Passed |
| Wrong or missing birth year | Refused |
| Running the rules twice | No repeat messages |
| WhatsApp-off patient | Uses SMS |
| Patient who said no to messages | Skipped, with the reason shown |
| Stopped share link | Refused |
| Message hook with a local listener | Received |
| Message hook with the service down | Marked Failed |
| Chest pain before a visit | Urgent guidance shown and doctor alerted |
| Unit tests | 24 passed |

## Known limits

- **Birth year is weak protection.** It is only suitable for a demo. Real use needs one-time codes sent to the patient's phone, and limits on repeated attempts.
- **The emergency card has no lock**, so anyone with its link can read it. Each view is logged.
- **Original report images have no access check** in this demo.
- **The doctor screens have no sign-in** in this demo.
- **Wait times are estimates**, at 10 minutes per patient.
- **Medicine ticks are self-reported**, so they don't prove a dose was taken.
- **Reading limits and urgent symptoms must be set by a doctor.** The list of urgent symptoms is short, and it does not replace medical advice.
- **Urdu text and audio need review** by a fluent reader before patients rely on them.
