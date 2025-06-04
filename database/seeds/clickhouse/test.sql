-- Test seed data for ClickHouse
-- This file contains minimal test data for automated testing

USE errly_events;

-- Insert test error event
INSERT INTO error_events (
    id, project_id, timestamp, message, environment, level, fingerprint, user_id, tags, extra
) VALUES
    ('test_event_001', 'test-project-id-00000000000000000000000', now64(), 'Test error message', 'test', 'error', 'test_fp_001', 'test_user_001', {'test': 'true'}, {'test_data': 'value'});

-- Insert corresponding test issue
INSERT INTO issues (
    id, project_id, fingerprint, message, level, status, first_seen, last_seen, event_count, user_count, environments, tags
) VALUES
    ('test_issue_001', 'test-project-id-00000000000000000000000', 'test_fp_001', 'Test error message', 'error', 'unresolved', now64(), now64(), 1, 1, ['test'], {'test': 'true'});
