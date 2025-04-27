CREATE TABLE IF NOT EXISTS clock_entries (
  id SERIAL PRIMARY KEY,
  worker_name VARCHAR(100) NOT NULL,
  project_name VARCHAR(100),
  clock_in TIMESTAMP NOT NULL,
  clock_out TIMESTAMP,
  notes TEXT,
  is_paid BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS workers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  phone_number VARCHAR(20),
  pay_rate NUMERIC(10,2) DEFAULT 0
);
