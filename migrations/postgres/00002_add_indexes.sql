-- +goose Up
-- Add database indexes for better performance

CREATE INDEX idx_spaces_slug ON spaces(slug);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_space ON users(space_id);
CREATE INDEX idx_projects_space ON projects(space_id);
CREATE INDEX idx_projects_slug ON projects(space_id, slug);
CREATE INDEX idx_api_keys_project ON api_keys(project_id);
CREATE INDEX idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_prefix ON api_keys(key_prefix);
CREATE INDEX idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX idx_user_sessions_user ON user_sessions(user_id);

-- +goose Down
-- Rollback indexes

DROP INDEX IF EXISTS idx_user_sessions_user;
DROP INDEX IF EXISTS idx_user_sessions_token;
DROP INDEX IF EXISTS idx_api_keys_prefix;
DROP INDEX IF EXISTS idx_api_keys_hash;
DROP INDEX IF EXISTS idx_api_keys_project;
DROP INDEX IF EXISTS idx_projects_slug;
DROP INDEX IF EXISTS idx_projects_space;
DROP INDEX IF EXISTS idx_users_space;
DROP INDEX IF EXISTS idx_users_email;
DROP INDEX IF EXISTS idx_spaces_slug;
