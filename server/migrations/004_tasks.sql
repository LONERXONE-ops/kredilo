-- A task is work a doer completes for tokens. Two kinds:
--   admin  — created by an admin/owner, funded from the shared reserve
--   posted — created by a regular user who paid to post it; funded from its own pool
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('admin', 'posted')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Other',
  reward_tokens INTEGER NOT NULL CHECK (reward_tokens > 0),
  proof_type TEXT NOT NULL DEFAULT 'screenshot' CHECK (proof_type IN ('screenshot', 'link', 'text', 'none')),
  needs_handle INTEGER NOT NULL DEFAULT 0,
  photo_file TEXT,
  max_completions INTEGER NOT NULL CHECK (max_completions > 0),
  approved_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_payment', 'pending_review', 'live', 'closed', 'rejected')),
  created_by TEXT NOT NULL REFERENCES users(id),
  pool_tokens INTEGER NOT NULL DEFAULT 0,
  price_naira INTEGER,
  days INTEGER,
  expires_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX tasks_status ON tasks(status);
CREATE INDEX tasks_creator ON tasks(created_by);

CREATE TABLE submissions (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES tasks(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'pending_review', 'approved', 'rejected')),
  proof_file TEXT,
  proof_text TEXT,
  handle TEXT,
  proof_hash TEXT,
  reject_reason TEXT,
  reviewed_by TEXT REFERENCES users(id),
  submitted_at TEXT,
  reviewed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (task_id, user_id)
);
CREATE INDEX submissions_task ON submissions(task_id);
CREATE INDEX submissions_user ON submissions(user_id);
CREATE UNIQUE INDEX submissions_task_handle ON submissions(task_id, handle) WHERE handle IS NOT NULL;
