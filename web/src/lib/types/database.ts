// PostgreSQL Types (Transactional Data)
// NOTE: Use Prisma types for PostgreSQL entities instead of defining them here
// Import from: '@/lib/db/prisma' or '@/lib/repositories/prisma'

import { JsonValue } from './api';

// Re-export Prisma types for convenience
export type {
  Space,
  User,
  Project,
  ApiKey,
  UserSession,
  CreateSpace,
  CreateUser,
  CreateProject,
  CreateApiKey,
  // Legacy alias for backward compatibility
  Space as Organization,
  CreateSpace as CreateOrganization,
} from '../db/prisma';

// Import Project type for use in interfaces
import type { Project } from '../db/prisma';

// Additional types that extend Prisma types
export interface ProjectSettings {
  environments: string[];
  alert_rules: AlertRule[];
  retention_days: number;
  sample_rate: number;
}

// Project with properly typed settings
export interface ProjectWithSettings extends Omit<Project, 'settings'> {
  settings: ProjectSettings | null;
}

// Helper function to convert Project to ProjectWithSettings
export function toProjectWithSettings(project: Project): ProjectWithSettings {
  return {
    ...project,
    settings: project.settings ? (project.settings as unknown as ProjectSettings) : null
  };
}

export interface AlertRule {
  id: string;
  name: string;
  condition: string;
  threshold: number;
  enabled: boolean;
}

export interface ApiKeyWithToken {
  id: string;
  name: string;
  key_prefix: string;
  project_id: string | null;
  scopes: string[];
  last_used_at: Date | null;
  created_at: Date | null;
  expires_at: Date | null;
  token?: string; // Only available when creating a new key
}

export type ApiKeyScope = 'ingest' | 'read' | 'admin';

export interface CreateApiKeyRequest {
  name: string;
  scopes: ApiKeyScope[];
  expires_at?: Date;
}

// ClickHouse Types (Analytical Data)

export interface ErrorEvent {
  id: string;
  project_id: string;
  timestamp: Date;
  message: string;
  stack_trace: string | null;
  environment: string;
  release_version: string | null;
  user_id: string | null;
  user_email: string | null;
  user_ip: string | null;
  browser: string | null;
  os: string | null;
  url: string | null;
  tags: Record<string, string>;
  extra: Record<string, JsonValue>;
  fingerprint: string;
  level: IssueLevel;
  status: IssueStatus;
  first_seen: Date;
  last_seen: Date;
  count: number;
}

export interface Issue {
  id: string;
  project_id: string;
  fingerprint: string;
  message: string;
  level: IssueLevel;
  status: IssueStatus;
  first_seen: Date;
  last_seen: Date;
  event_count: number;
  user_count: number;
  environments: string[];
  tags: Record<string, string>;
}

// Analytics Types

export interface ProjectStats {
  project_id: string;
  total_events: number;
  total_issues: number;
  unresolved_issues: number;
  affected_users: number;
  error_rate: number;
  last_event: Date | null;
}

export interface TimeSeriesPoint {
  timestamp: Date;
  value: number;
}

export interface IssueStats {
  issue_id: string;
  event_count: number;
  user_count: number;
  environments: string[];
  first_seen: Date;
  last_seen: Date;
  trend: 'up' | 'down' | 'stable';
}

// Type aliases for better reusability
export type IssueStatus = 'unresolved' | 'resolved' | 'ignored';
export type IssueLevel = 'error' | 'warning' | 'info' | 'debug';
export type IssueStatusFilter = IssueStatus | 'all';
export type IssueLevelFilter = IssueLevel | 'all';

// Query Parameters
export interface IssuesQueryParams {
  project_id?: string;
  status?: IssueStatusFilter;
  environment?: string;
  level?: IssueLevelFilter;
  search?: string;
  time_range?: '1h' | '24h' | '7d' | '30d';
  page?: number;
  limit?: number;
  sort_by?: 'last_seen' | 'first_seen' | 'event_count' | 'user_count';
  sort_order?: 'asc' | 'desc';
  [key: string]: unknown; // Index signature for cache key generation
}

// Search parameters from URL (all optional strings)
export interface IssuesSearchParams {
  project?: string;
  status?: string;
  environment?: string;
  level?: string;
  search?: string;
  page?: string;
}

export interface EventsQueryParams {
  issue_id?: string;
  project_id?: string;
  environment?: string;
  user_id?: string;
  time_range?: '1h' | '24h' | '7d' | '30d';
  page?: number;
  limit?: number;
  [key: string]: unknown; // Index signature for cache key generation
}

// Response Types

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface IssuesResponse extends PaginatedResponse<Issue> {
  stats: {
    total_issues: number;
    unresolved_issues: number;
    resolved_issues: number;
    ignored_issues: number;
  };
}

export interface EventsResponse extends PaginatedResponse<ErrorEvent> {
  issue: Issue | null;
}
