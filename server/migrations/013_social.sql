-- Social-follow onboarding: a user claims a one-time kred bonus per platform they follow.
CREATE TABLE social_follows (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  platform TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (user_id, platform)
);
CREATE INDEX social_follows_user ON social_follows(user_id);
