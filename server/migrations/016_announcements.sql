-- Broadcast announcements the owner sends to everyone, kept as a history so they can be
-- reviewed and edited. Each send also writes one notification per user (ref_type 'announcement',
-- ref_id = this announcement's id), so editing the announcement can update what users see.
CREATE TABLE announcements (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT,
  image_file TEXT,
  sent_by TEXT REFERENCES users(id),
  sent_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT
);
-- Optional image shown inside a notification (used by announcements).
ALTER TABLE notifications ADD COLUMN image_file TEXT;
