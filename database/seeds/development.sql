-- Development seed data for Errly
-- This file contains sample data for local development and testing

-- Insert sample space
INSERT INTO spaces (id, name, slug, description) VALUES
    ('550e8400-e29b-41d4-a716-446655440000', 'Demo Space', 'demo-space', 'Sample space for testing')
ON CONFLICT (slug) DO NOTHING;

-- Insert sample user
INSERT INTO users (id, email, name, space_id, role) VALUES
    ('550e8400-e29b-41d4-a716-446655440001', 'admin@demo.com', 'Demo Admin', '550e8400-e29b-41d4-a716-446655440000', 'admin')
ON CONFLICT (email) DO NOTHING;

-- Insert sample projects
INSERT INTO projects (id, name, slug, space_id, platform, framework, description) VALUES
    ('550e8400-e29b-41d4-a716-446655440002', 'Demo Web App', 'demo-web', '550e8400-e29b-41d4-a716-446655440000', 'web', 'nextjs', 'Sample web application project'),
    ('550e8400-e29b-41d4-a716-446655440003', 'Demo Mobile App', 'demo-mobile', '550e8400-e29b-41d4-a716-446655440000', 'mobile', 'react-native', 'Sample mobile application project')
ON CONFLICT (space_id, slug) DO NOTHING;

-- Insert sample API keys (for testing - these are not real keys)
INSERT INTO api_keys (id, name, key_hash, key_prefix, project_id, scopes) VALUES
    ('550e8400-e29b-41d4-a716-446655440004', 'Demo Web API Key', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RX.PZa2u.', 'errly_webf_demo', '550e8400-e29b-41d4-a716-446655440002', ARRAY['ingest', 'read']),
    ('550e8400-e29b-41d4-a716-446655440005', 'Demo Mobile API Key', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RX.PZa2u.', 'errly_mobf_demo', '550e8400-e29b-41d4-a716-446655440003', ARRAY['ingest', 'read'])
ON CONFLICT (key_hash) DO NOTHING;
