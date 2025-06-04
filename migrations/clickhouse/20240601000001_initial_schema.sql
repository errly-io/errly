-- +goose Up
-- ClickHouse schema for Errly - Create initial tables for events and analytics

-- Create database if not exists
CREATE DATABASE IF NOT EXISTS errly_events;

-- Use the database
USE errly_events;

-- Error events table - stores all incoming error events
CREATE TABLE IF NOT EXISTS error_events (
    id String,
    project_id String,
    timestamp DateTime64(3),
    message String,
    stack_trace Nullable(String),
    environment String,
    release_version Nullable(String),
    user_id Nullable(String),
    user_email Nullable(String),
    user_ip Nullable(String),
    browser Nullable(String),
    os Nullable(String),
    url Nullable(String),
    tags Map(String, String),
    extra Map(String, String),
    fingerprint String,
    level Enum8('error' = 1, 'warning' = 2, 'info' = 3, 'debug' = 4),
    created_at DateTime64(3) DEFAULT now64()
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (project_id, fingerprint, timestamp)
TTL timestamp + INTERVAL 90 DAY;

-- Issues table - aggregated view of error events grouped by fingerprint
CREATE TABLE IF NOT EXISTS issues (
    id String,
    project_id String,
    fingerprint String,
    message String,
    level Enum8('error' = 1, 'warning' = 2, 'info' = 3, 'debug' = 4),
    status Enum8('unresolved' = 1, 'resolved' = 2, 'ignored' = 3),
    first_seen DateTime64(3),
    last_seen DateTime64(3),
    event_count UInt64,
    user_count UInt64,
    environments Array(String),
    tags Map(String, String),
    updated_at DateTime64(3) DEFAULT now64()
) ENGINE = ReplacingMergeTree(updated_at)
ORDER BY (project_id, id);

-- +goose Down
-- Drop ClickHouse tables

USE errly_events;

DROP TABLE IF EXISTS issues;
DROP TABLE IF EXISTS error_events;

-- Note: We don't drop the database to preserve other potential tables
