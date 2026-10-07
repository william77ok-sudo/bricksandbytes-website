CREATE TABLE IF NOT EXISTS relay_pilot_leads (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  organisation TEXT NOT NULL DEFAULT '',
  location TEXT NOT NULL,
  applicant_type TEXT NOT NULL,
  participant_count INTEGER NOT NULL,
  problem TEXT NOT NULL,
  consent_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  owner TEXT NOT NULL DEFAULT 'Unassigned',
  updated_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_relay_pilot_leads_created_at ON relay_pilot_leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_relay_pilot_leads_status ON relay_pilot_leads(status);
