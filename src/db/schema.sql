-- Ascend AI Knowledge Base Schema
-- SQLite database for self-learning content patterns

CREATE TABLE IF NOT EXISTS successful_content (
  id TEXT PRIMARY KEY,
  client_industry TEXT NOT NULL,
  target_audience TEXT NOT NULL,
  content_type TEXT NOT NULL,           -- 'homepage_hero', 'about_page', 'service_page', etc.
  content TEXT NOT NULL,                 -- The actual content that passed
  target_keyword TEXT DEFAULT '',
  brand_tone TEXT DEFAULT '',            -- e.g. "friendly, approachable, professional"
  website_goal TEXT DEFAULT '',          -- e.g. "phone calls", "form leads"

  -- Audit results
  seo_score INTEGER DEFAULT 0,
  no_fluff_score INTEGER DEFAULT 0,
  conversion_score INTEGER DEFAULT 0,
  helpfulness_score INTEGER DEFAULT 0,
  readability_score INTEGER DEFAULT 0,
  brand_alignment_score INTEGER DEFAULT 0,
  completeness_score INTEGER DEFAULT 0,
  unique_value_score INTEGER DEFAULT 0,
  overall_score REAL DEFAULT 0,

  -- Learning data
  pass_reasons TEXT DEFAULT '',          -- Why this content passed the audit
  fail_history TEXT DEFAULT '[]',        -- JSON array of previous failures + feedback
  attempts_to_pass INTEGER DEFAULT 1,

  -- Metadata
  client_name TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Index for fast lookups by industry + audience + content_type
CREATE INDEX IF NOT EXISTS idx_content_lookup
  ON successful_content(client_industry, target_audience, content_type);

-- Index for finding best-performing content
CREATE INDEX IF NOT EXISTS idx_content_score
  ON successful_content(overall_score DESC);

-- Track audit failures for learning what NOT to do
CREATE TABLE IF NOT EXISTS audit_failures (
  id TEXT PRIMARY KEY,
  client_industry TEXT NOT NULL,
  content_type TEXT NOT NULL,
  failed_checks TEXT NOT NULL,           -- JSON array of check names that failed
  feedback TEXT NOT NULL,                -- The audit feedback given
  attempt_number INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_failures_lookup
  ON audit_failures(client_industry, content_type);

-- Pipeline runs for tracking / debugging
CREATE TABLE IF NOT EXISTS pipeline_runs (
  id TEXT PRIMARY KEY,
  client_name TEXT NOT NULL,
  client_email TEXT NOT NULL,
  status TEXT DEFAULT 'started',         -- started, research_complete, content_writing, auditing, approved, emailed, failed
  form_data TEXT NOT NULL,               -- JSON of parsed Tally form
  research_report TEXT DEFAULT '',       -- JSON of research findings
  content_markdown TEXT DEFAULT '',      -- Final approved content
  audit_attempts INTEGER DEFAULT 0,
  drive_report_link TEXT DEFAULT '',
  drive_content_link TEXT DEFAULT '',
  error_message TEXT DEFAULT '',
  started_at TEXT DEFAULT (datetime('now')),
  completed_at TEXT DEFAULT NULL
);
