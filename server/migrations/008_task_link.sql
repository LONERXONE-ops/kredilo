-- Optional external link a doer must visit to complete the task (e.g. an app sign-up page),
-- and lets admin-created tasks carry an illustrative photo like posted tasks already can.
ALTER TABLE tasks ADD COLUMN link_url TEXT;
