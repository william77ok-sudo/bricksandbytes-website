-- Supports the duplicate-submission check in functions/api/relay-pilot.js. Additive; no data changes.
CREATE INDEX IF NOT EXISTS idx_relay_pilot_leads_email_created_at ON relay_pilot_leads(email, created_at);
