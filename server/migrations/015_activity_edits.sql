-- Activity monitoring: when a user was last seen making an authenticated request.
ALTER TABLE users ADD COLUMN last_seen_at TEXT;
-- When a posted task went live (admin confirmed payment). Starts the poster's 1-hour edit window.
ALTER TABLE tasks ADD COLUMN went_live_at TEXT;
CREATE INDEX IF NOT EXISTS users_last_seen ON users(last_seen_at);
