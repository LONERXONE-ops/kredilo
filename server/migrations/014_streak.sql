-- Daily check-in streak: how many consecutive days a user has claimed, and the last day they did.
ALTER TABLE users ADD COLUMN streak INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN last_streak_day TEXT;
