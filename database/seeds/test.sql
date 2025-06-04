-- Test seed data for Errly
-- This file contains minimal data for automated testing

-- Insert test space
INSERT INTO spaces (id, name, slug, description) VALUES
    ('test-space-id-000000000000000000000000', 'Test Space', 'test-space', 'Space for automated testing')
ON CONFLICT (slug) DO NOTHING;

-- Insert test user
INSERT INTO users (id, email, name, space_id, role) VALUES
    ('test-user-id-0000000000000000000000000', 'test@example.com', 'Test User', 'test-space-id-000000000000000000000000', 'admin')
ON CONFLICT (email) DO NOTHING;

-- Insert test project
INSERT INTO projects (id, name, slug, space_id, platform, framework, description) VALUES
    ('test-project-id-00000000000000000000000', 'Test Project', 'test-project', 'test-space-id-000000000000000000000000', 'web', 'nextjs', 'Project for automated testing')
ON CONFLICT (space_id, slug) DO NOTHING;

-- Insert test API key
INSERT INTO api_keys (id, name, key_hash, key_prefix, project_id, scopes) VALUES
    ('test-api-key-id-0000000000000000000000', 'Test API Key', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RX.PZa2u.', 'errly_test_key', 'test-project-id-00000000000000000000000', ARRAY['ingest', 'read'])
ON CONFLICT (key_hash) DO NOTHING;
