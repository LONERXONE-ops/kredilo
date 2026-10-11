-- Receipt the poster uploads as evidence of their bank transfer (filename only; the real bytes live in uploads/).
ALTER TABLE tasks ADD COLUMN receipt_file TEXT;
-- Admin's note when confirming or rejecting a posted task's payment.
ALTER TABLE tasks ADD COLUMN payment_note TEXT;

-- Editable pricing for posting a task, kept as dated versions (newest row wins).
-- Prices are in naira; reward is tokens per completion.
CREATE TABLE post_pricing (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  days INTEGER NOT NULL,
  price_naira INTEGER NOT NULL,
  reward_tokens INTEGER NOT NULL,
  effective_from TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
INSERT INTO post_pricing (days, price_naira, reward_tokens) VALUES
  (1, 1000, 30),
  (2, 2000, 60);
