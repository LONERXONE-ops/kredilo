-- Platform money settings, kept as dated versions so a change never alters past records.
CREATE TABLE settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tokens_per_naira_num INTEGER NOT NULL,   -- tokens
  tokens_per_naira_den INTEGER NOT NULL,   -- per this many naira  (100 tokens / 50 naira)
  min_withdrawal_tokens INTEGER NOT NULL,
  effective_from TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
INSERT INTO settings (tokens_per_naira_num, tokens_per_naira_den, min_withdrawal_tokens)
VALUES (100, 50, 2000);

-- Append-only token ledger. The balance is the SUM of a user's entries; rows are never edited or deleted.
CREATE TABLE ledger (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id),
  amount INTEGER NOT NULL,               -- tokens, may be negative
  reason TEXT NOT NULL,                  -- task_reward | withdrawal_hold | withdrawal_release | admin_adjust | post_refund ...
  ref_type TEXT,                         -- what the entry points at (task, withdrawal, ...)
  ref_id TEXT,
  rate_num INTEGER,                      -- snapshot of the rate when a reward was credited
  rate_den INTEGER,
  idempotency_key TEXT UNIQUE,           -- blocks duplicate credits for the same event
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX ledger_user ON ledger(user_id);
CREATE TRIGGER ledger_no_update BEFORE UPDATE ON ledger
BEGIN SELECT RAISE(ABORT, 'ledger is append-only'); END;
CREATE TRIGGER ledger_no_delete BEFORE DELETE ON ledger
BEGIN SELECT RAISE(ABORT, 'ledger is append-only'); END;

-- Reserve: money the owner has actually set aside to fund rewards, tracked in tokens.
-- Available to issue = SUM(amount). Credits add funding; reward issuance subtracts.
CREATE TABLE reserve (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  amount INTEGER NOT NULL,               -- tokens, +funding / -issued
  reason TEXT NOT NULL,                  -- initial_reserve | task_pool | reward_issued | reward_reversed | funding_add ...
  ref_type TEXT,
  ref_id TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE TRIGGER reserve_no_update BEFORE UPDATE ON reserve
BEGIN SELECT RAISE(ABORT, 'reserve is append-only'); END;
CREATE TRIGGER reserve_no_delete BEFORE DELETE ON reserve
BEGIN SELECT RAISE(ABORT, 'reserve is append-only'); END;

-- Seed the approved reward reserve: ₦2,400 at 100 tokens = ₦50 is 4,800 tokens.
INSERT INTO reserve (amount, reason, ref_type) VALUES (4800, 'initial_reserve', 'launch');
