-- Platform flags admins can flip (newest row per key wins). Used for the withdrawal go-live date.
CREATE TABLE platform_flags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT NOT NULL,
  value TEXT,
  updated_by TEXT REFERENCES users(id),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
INSERT INTO platform_flags (key, value) VALUES ('withdrawals_open_at', NULL);

CREATE TABLE withdrawals (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  amount_tokens INTEGER NOT NULL CHECK (amount_tokens > 0),
  amount_naira INTEGER NOT NULL,
  rate_num INTEGER NOT NULL,
  rate_den INTEGER NOT NULL,
  bank_name TEXT NOT NULL,
  account_name_enc TEXT NOT NULL,
  account_number_enc TEXT NOT NULL,
  account_last4 TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'processing', 'paid', 'cancelled')),
  transfer_ref TEXT,
  admin_note TEXT,
  not_received INTEGER NOT NULL DEFAULT 0,
  handled_by TEXT REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX withdrawals_user ON withdrawals(user_id);
CREATE INDEX withdrawals_status ON withdrawals(status);
CREATE UNIQUE INDEX withdrawals_one_open ON withdrawals(user_id) WHERE status IN ('requested', 'processing');
