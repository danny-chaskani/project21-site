-- Copy of every quote request, so none is lost if the email fails.
CREATE TABLE IF NOT EXISTS quote_requests (
  id           TEXT PRIMARY KEY,          -- P21-Q-YYMMDD-XXXX
  created_at   TEXT NOT NULL,             -- ISO time on the server
  sent_at      TEXT,                      -- ISO time from the browser
  name         TEXT NOT NULL,
  email        TEXT NOT NULL,
  phone        TEXT NOT NULL,             -- E.164
  notes        TEXT NOT NULL DEFAULT '',
  items_json   TEXT NOT NULL,
  page_url     TEXT NOT NULL DEFAULT '',
  ip_hash      TEXT NOT NULL,             -- for rate limiting only, never the raw IP
  email_status TEXT NOT NULL DEFAULT 'pending',  -- pending | sent | failed
  email_error  TEXT
);

CREATE INDEX IF NOT EXISTS idx_quote_ip_time ON quote_requests (ip_hash, created_at);
