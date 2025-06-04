-- Development seed data for ClickHouse
-- This file contains sample error events and issues for local development

USE errly_events;

-- Insert sample error events
INSERT INTO error_events (
    id, project_id, timestamp, message, environment, level, fingerprint, user_id, tags, extra
) VALUES
    ('sample_001', '550e8400-e29b-41d4-a716-446655440002', now64(), 'TypeError: Cannot read property of undefined', 'development', 'error', 'fp_001', 'user_001', {'component': 'Dashboard'}, {'line': '42'}),
    ('sample_002', '550e8400-e29b-41d4-a716-446655440002', now64(), 'Network request failed', 'production', 'error', 'fp_002', 'user_002', {'api': 'users'}, {'status': '500'}),
    ('sample_003', '550e8400-e29b-41d4-a716-446655440003', now64(), 'App crashed on startup', 'production', 'error', 'fp_003', 'user_003', {'platform': 'ios'}, {'version': '1.0.0'});

-- Insert corresponding issues
INSERT INTO issues (
    id, project_id, fingerprint, message, level, status, first_seen, last_seen, event_count, user_count, environments, tags
) VALUES
    ('issue_001', '550e8400-e29b-41d4-a716-446655440002', 'fp_001', 'TypeError: Cannot read property of undefined', 'error', 'unresolved', now64(), now64(), 1, 1, ['development'], {'component': 'Dashboard'}),
    ('issue_002', '550e8400-e29b-41d4-a716-446655440002', 'fp_002', 'Network request failed', 'error', 'unresolved', now64(), now64(), 1, 1, ['production'], {'api': 'users'}),
    ('issue_003', '550e8400-e29b-41d4-a716-446655440003', 'fp_003', 'App crashed on startup', 'error', 'unresolved', now64(), now64(), 1, 1, ['production'], {'platform': 'ios'});

-- Optimize tables (force merge of parts)
OPTIMIZE TABLE error_events;
OPTIMIZE TABLE issues;
