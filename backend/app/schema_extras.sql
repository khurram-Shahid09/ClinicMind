ALTER TABLE patient ADD COLUMN IF NOT EXISTS whatsapp_opt_in BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE patient ADD COLUMN IF NOT EXISTS sms_opt_in BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE patient ADD COLUMN IF NOT EXISTS portal_token TEXT;
ALTER TABLE patient ADD COLUMN IF NOT EXISTS emergency_token TEXT;
ALTER TABLE patient ADD COLUMN IF NOT EXISTS family_name TEXT;
ALTER TABLE patient ADD COLUMN IF NOT EXISTS family_phone TEXT;
ALTER TABLE patient ADD COLUMN IF NOT EXISTS family_opt_in BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS alert_rule (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  audience TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  auto_send BOOLEAN NOT NULL DEFAULT TRUE,
  position INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS message (
  id SERIAL PRIMARY KEY,
  rule_code TEXT NOT NULL,
  dedupe_key TEXT UNIQUE NOT NULL,
  patient_id INT NOT NULL REFERENCES patient(id),
  audience TEXT NOT NULL,
  channel TEXT NOT NULL,
  recipient TEXT,
  body_en TEXT NOT NULL,
  body_ur TEXT,
  status TEXT NOT NULL,
  reason TEXT,
  reply TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS medicine_dose (
  id SERIAL PRIMARY KEY,
  patient_id INT NOT NULL REFERENCES patient(id),
  medicine TEXT NOT NULL,
  dose_date DATE NOT NULL,
  slot TEXT NOT NULL,
  taken BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE (patient_id, medicine, dose_date, slot)
);

CREATE TABLE IF NOT EXISTS home_reading (
  id SERIAL PRIMARY KEY,
  patient_id INT NOT NULL REFERENCES patient(id),
  kind TEXT NOT NULL,
  value DOUBLE PRECISION NOT NULL,
  value2 DOUBLE PRECISION,
  reading_date DATE NOT NULL,
  flagged BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS queue_entry (
  visit_id INT PRIMARY KEY REFERENCES visit(id),
  patient_id INT NOT NULL REFERENCES patient(id),
  token_no INT NOT NULL,
  status TEXT NOT NULL DEFAULT 'waiting',
  checked_in_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS previsit (
  visit_id INT PRIMARY KEY REFERENCES visit(id),
  patient_id INT NOT NULL REFERENCES patient(id),
  symptoms JSONB NOT NULL,
  note TEXT,
  question TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS share_link (
  id SERIAL PRIMARY KEY,
  patient_id INT NOT NULL REFERENCES patient(id),
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS access_log (
  id SERIAL PRIMARY KEY,
  patient_id INT NOT NULL REFERENCES patient(id),
  who TEXT NOT NULL,
  what TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
