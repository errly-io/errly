-- +goose Up
-- Add password field to users table for credential-based authentication

ALTER TABLE users ADD COLUMN password_hash VARCHAR(255);

-- Create index for better performance on password lookups
CREATE INDEX idx_users_password ON users(password_hash) WHERE password_hash IS NOT NULL;

-- +goose Down
-- Remove password field and index

DROP INDEX IF EXISTS idx_users_password;
ALTER TABLE users DROP COLUMN IF EXISTS password_hash;
