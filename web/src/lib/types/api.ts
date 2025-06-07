/**
 * Strict TypeScript types for API layer
 * Replaces 'any' types with proper type definitions
 */

import { NextRequest, NextResponse } from 'next/server';

// API Handler types
export interface ApiContext {
  params: Record<string, string | string[]>;
  searchParams?: URLSearchParams;
}

export type ApiHandler<T = unknown> = (
  request: NextRequest,
  context: ApiContext
) => Promise<NextResponse<T>>;

export type SecureApiHandler<T = unknown> = (
  request: NextRequest,
  context: ApiContext
) => Promise<NextResponse<T>>;

// Request/Response types
export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  code?: string;
  timestamp: string;
  success: boolean;
}

export interface ApiErrorResponse {
  error: string;
  code: string;
  timestamp: string;
  success: false;
  details?: Record<string, unknown>;
}

export interface ApiSuccessResponse<T = unknown> {
  data: T;
  timestamp: string;
  success: true;
  meta?: ResponseMeta;
}

export interface ResponseMeta {
  page?: number;
  limit?: number;
  total?: number;
  hasMore?: boolean;
}

// Pagination types
export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Query parameter types
export interface QueryParams {
  [key: string]: string | string[] | undefined;
}

export interface FilterParams {
  search?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Session types
export interface SessionData {
  id: string;
  userId: string;
  userAgent: string;
  ipAddress: string;
  createdAt: string;
  lastAccessedAt: string;
  expiresAt: string;
  isActive: boolean;
}

export interface CreateSessionRequest {
  userAgent: string;
  ipAddress: string;
  expiresIn?: number; // seconds
}

// User types for API
export interface UserApiData {
  id: string;
  email: string;
  name: string | null;
  avatar: string | null;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  lastLoginAt: string | null;
}

export interface CreateUserRequest {
  email: string;
  password: string;
  name?: string;
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
  avatar?: string;
}

// Project types for API
export interface ProjectApiData {
  id: string;
  name: string;
  description: string | null;
  spaceId: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  settings: ProjectSettings;
}

export interface ProjectSettings {
  errorRetention: number; // days
  alertsEnabled: boolean;
  publicStats: boolean;
  allowedDomains: string[];
}

export interface CreateProjectRequest {
  name: string;
  description?: string;
  spaceId: string;
  settings?: Partial<ProjectSettings>;
}

// Error/Issue types for API
export interface IssueApiData {
  id: string;
  title: string;
  message: string;
  status: IssueStatus;
  level: IssueLevel;
  projectId: string;
  firstSeenAt: string;
  lastSeenAt: string;
  count: number;
  isResolved: boolean;
  fingerprint: string;
  stackTrace: StackFrame[];
  tags: Record<string, string>;
  metadata: IssueMetadata;
}

export type IssueStatus = 'open' | 'resolved' | 'ignored' | 'archived';
export type IssueLevel = 'error' | 'warning' | 'info' | 'debug';

export interface StackFrame {
  filename: string;
  function: string;
  lineno: number;
  colno: number;
  context: string[];
}

export interface IssueMetadata {
  browser?: string;
  os?: string;
  userAgent?: string;
  url?: string;
  userId?: string;
  environment?: string;
  release?: string;
}

// Event types for API
export interface EventApiData {
  id: string;
  issueId: string;
  message: string;
  level: IssueLevel;
  timestamp: string;
  fingerprint: string;
  stackTrace: StackFrame[];
  tags: Record<string, string>;
  extra: Record<string, JsonValue>;
  user: EventUser | null;
  request: EventRequest | null;
}

export interface EventUser {
  id?: string;
  email?: string;
  username?: string;
  ipAddress?: string;
}

export interface EventRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
  query: Record<string, string>;
  data?: Record<string, JsonValue>;
}

// JSON value type for safe serialization
export type JsonValue = 
  | string 
  | number 
  | boolean 
  | null 
  | JsonValue[] 
  | { [key: string]: JsonValue };

// API Key types
export interface ApiKeyData {
  id: string;
  name: string;
  keyPreview: string; // First 8 characters
  scopes: ApiKeyScope[];
  projectId: string;
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  isActive: boolean;
}

export type ApiKeyScope = 
  | 'event:write'
  | 'event:read'
  | 'issue:read'
  | 'issue:write'
  | 'project:read'
  | 'project:write';

export interface CreateApiKeyRequest {
  name: string;
  scopes: ApiKeyScope[];
  projectId: string;
  expiresIn?: number; // days
}

// Webhook types
export interface WebhookData {
  id: string;
  url: string;
  events: WebhookEvent[];
  projectId: string;
  isActive: boolean;
  secret: string;
  createdAt: string;
  lastTriggeredAt: string | null;
}

export type WebhookEvent = 
  | 'issue.created'
  | 'issue.resolved'
  | 'issue.reopened'
  | 'event.created';

export interface CreateWebhookRequest {
  url: string;
  events: WebhookEvent[];
  projectId: string;
  secret?: string;
}

// Search and filtering types
export interface SearchRequest {
  query: string;
  filters?: SearchFilters;
  pagination?: PaginationParams;
}

export interface SearchFilters {
  projectIds?: string[];
  levels?: IssueLevel[];
  statuses?: IssueStatus[];
  dateRange?: {
    from: string;
    to: string;
  };
  tags?: Record<string, string>;
}

export interface SearchResult<T> {
  items: T[];
  total: number;
  facets: SearchFacets;
}

export interface SearchFacets {
  levels: Record<IssueLevel, number>;
  statuses: Record<IssueStatus, number>;
  projects: Record<string, number>;
  tags: Record<string, Record<string, number>>;
}

// Validation types
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
  value?: unknown;
}

// Rate limiting types
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

// Security types
export interface SecurityEvent {
  type: SecurityEventType;
  timestamp: string;
  ip: string;
  userAgent: string;
  userId?: string;
  details: Record<string, JsonValue>;
}

export type SecurityEventType = 
  | 'auth_failure'
  | 'rate_limit_exceeded'
  | 'suspicious_request'
  | 'invalid_headers'
  | 'csrf_violation';

// Type guards
export function isApiErrorResponse(response: unknown): response is ApiErrorResponse {
  return (
    typeof response === 'object' &&
    response !== null &&
    'error' in response &&
    'success' in response &&
    (response as ApiErrorResponse).success === false
  );
}

export function isApiSuccessResponse<T>(response: unknown): response is ApiSuccessResponse<T> {
  return (
    typeof response === 'object' &&
    response !== null &&
    'data' in response &&
    'success' in response &&
    (response as ApiSuccessResponse<T>).success === true
  );
}

export function isJsonValue(value: unknown): value is JsonValue {
  if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return true;
  }
  
  if (Array.isArray(value)) {
    return value.every(isJsonValue);
  }
  
  if (typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).every(isJsonValue);
  }
  
  return false;
}
