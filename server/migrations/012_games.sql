-- Daily game rewards. A user can claim each game's reward once per calendar day (UTC).
CREATE TABLE game_claims (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  game TEXT NOT NULL,
  day TEXT NOT NULL,
  kreds INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (user_id, game, day)
);
CREATE INDEX game_claims_user ON game_claims(user_id, day);
