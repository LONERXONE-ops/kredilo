-- Referrals: each user has a unique code; a new user can enter a referrer's code at signup.
-- The referrer earns a bonus when the referred user completes their first task (paid once).
ALTER TABLE users ADD COLUMN referral_code TEXT;
ALTER TABLE users ADD COLUMN referred_by TEXT REFERENCES users(id);
ALTER TABLE users ADD COLUMN referral_bonus_paid INTEGER NOT NULL DEFAULT 0;
CREATE INDEX users_referral_code ON users(referral_code);
CREATE INDEX users_referred_by ON users(referred_by);
