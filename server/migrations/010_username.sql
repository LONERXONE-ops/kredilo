-- A chosen display name, separate from the login email. Uniqueness is enforced in application
-- code (case-insensitive) rather than a DB constraint so this migration can't fail on backfill.
ALTER TABLE users ADD COLUMN username TEXT;
UPDATE users SET username = lower(substr(email, 1, instr(email, '@') - 1)) WHERE username IS NULL OR username = '';
CREATE INDEX users_username ON users(username);
