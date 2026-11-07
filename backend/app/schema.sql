CREATE TABLE IF NOT EXISTS patient (
  id SERIAL PRIMARY KEY,
  mrn TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  dob DATE NOT NULL,
  sex TEXT NOT NULL,
  phone TEXT
);

CREATE TABLE IF NOT EXISTS visit (
  id SERIAL PRIMARY KEY,
  patient_id INT NOT NULL REFERENCES patient(id),
  visit_date DATE NOT NULL,
  visit_time TEXT,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'completed'
);

CREATE TABLE IF NOT EXISTS batch (
  id SERIAL PRIMARY KEY,
  file_count INT NOT NULL,
  status TEXT NOT NULL DEFAULT 'running',
  saved_run BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS document (
  id SERIAL PRIMARY KEY,
  patient_id INT REFERENCES patient(id),
  file_name TEXT NOT NULL,
  sha TEXT NOT NULL,
  page_number INT NOT NULL DEFAULT 1,
  image_path TEXT NOT NULL,
  doc_type TEXT,
  doc_date DATE,
  text_content TEXT,
  search tsvector,
  status TEXT NOT NULL DEFAULT 'processed',
  UNIQUE (sha, page_number)
);
CREATE INDEX IF NOT EXISTS document_search ON document USING GIN (search);

-- Labs, medicines, allergies and conditions. Original values are always kept.
CREATE TABLE IF NOT EXISTS fact (
  id SERIAL PRIMARY KEY,
  patient_id INT REFERENCES patient(id),
  document_id INT NOT NULL REFERENCES document(id),
  fact_type TEXT NOT NULL,
  code TEXT,
  label TEXT NOT NULL,
  value_text TEXT,
  value_num DOUBLE PRECISION,
  unit TEXT,
  normal_range TEXT,
  frequency TEXT,
  fact_date DATE,
  box JSONB,
  confidence DOUBLE PRECISION,
  status TEXT NOT NULL,
  original_value TEXT,
  reason TEXT
);
CREATE INDEX IF NOT EXISTS fact_patient ON fact (patient_id, fact_type, status);

CREATE TABLE IF NOT EXISTS review_item (
  id SERIAL PRIMARY KEY,
  item_type TEXT NOT NULL,
  document_id INT NOT NULL REFERENCES document(id),
  fact_id INT REFERENCES fact(id),
  reason TEXT NOT NULL,
  suggested_value TEXT,
  options JSONB,
  status TEXT NOT NULL DEFAULT 'open',
  resolved_value TEXT,
  resolved_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS brief (
  patient_id INT PRIMARY KEY REFERENCES patient(id),
  headline TEXT,
  items JSONB NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  saved_run BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS draft (
  id SERIAL PRIMARY KEY,
  patient_id INT NOT NULL REFERENCES patient(id),
  visit_id INT REFERENCES visit(id),
  draft_type TEXT NOT NULL,
  content JSONB NOT NULL,
  transcript TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS agent_run (
  id SERIAL PRIMARY KEY,
  agent TEXT NOT NULL,
  patient_id INT,
  document_id INT,
  summary TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'done',
  actor TEXT NOT NULL DEFAULT 'AI helper',
  saved_run BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS board_event (
  id SERIAL PRIMARY KEY,
  batch_id INT NOT NULL,
  file_name TEXT,
  agent TEXT NOT NULL,
  status TEXT NOT NULL,
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
