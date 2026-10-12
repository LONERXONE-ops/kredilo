-- Profile picture reference: a Cloudinary URL, or "local:<filename>", or NULL.
ALTER TABLE users ADD COLUMN avatar_ref TEXT;
