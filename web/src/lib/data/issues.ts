import { issuesRepository } from '../repositories/clickhouse/issues';
import { Cache, generateCacheKey } from '../db/redis';
import { Issue, ErrorEvent, IssuesQueryParams, EventsQueryParams, PaginatedResponse } from '../types/database';

/**
 * Server-side data functions for Issues
 * These functions run on the server and can directly access ClickHouse
 */

export async function getIssues(params: IssuesQueryParams): Promise<PaginatedResponse<Issue>> {
  try {
    // Generate cache key based on parameters
    const cacheKey = generateCacheKey('issues', params);
    const cached = await Cache.get<PaginatedResponse<Issue>>(cacheKey);

    if (cached) {
      return cached;
    }

    // Get from ClickHouse
    const result = await issuesRepository.getIssues(params);

    // Cache for 1 minute (issues change frequently)
    await Cache.set(cacheKey, result, 60);

    return result;
  } catch (error) {
    console.error('Error fetching issues:', error);
    return {
      data: [],
      total: 0,
      page: params.page ?? 1,
      limit: params.limit ?? 50,
      has_next: false,
      has_prev: false,
    };
  }
}

export async function getIssue(issueId: string): Promise<Issue | null> {
  try {
    // Check cache
    const cacheKey = `issue:${issueId}`;
    const cached = await Cache.get<Issue>(cacheKey);

    if (cached) {
      return cached;
    }

    // Get from ClickHouse
    const issue = await issuesRepository.getIssueById(issueId);

    if (issue) {
      // Cache for 5 minutes
      await Cache.set(cacheKey, issue, 5 * 60);
    }

    return issue;
  } catch (error) {
    console.error('Error fetching issue:', error);
    return null;
  }
}

export async function getIssueEvents(params: EventsQueryParams): Promise<PaginatedResponse<ErrorEvent>> {
  try {
    // Generate cache key
    const cacheKey = generateCacheKey('events', params);
    const cached = await Cache.get<PaginatedResponse<ErrorEvent>>(cacheKey);

    if (cached) {
      return cached;
    }

    // Get from ClickHouse
    const result = await issuesRepository.getEvents(params);

    // Cache for 30 seconds (events change very frequently)
    await Cache.set(cacheKey, result, 30);

    return result;
  } catch (error) {
    console.error('Error fetching issue events:', error);
    return {
      data: [],
      total: 0,
      page: params.page ?? 1,
      limit: params.limit ?? 100,
      has_next: false,
      has_prev: false,
    };
  }
}

export async function getIssueTimeSeries(issueId: string, timeRange = '24h'): Promise<Array<{ timestamp: Date; count: number }>> {
  try {
    // Check cache
    const cacheKey = `issue:timeseries:${issueId}:${timeRange}`;
    const cached = await Cache.get<Array<{ timestamp: Date; count: number }>>(cacheKey);

    if (cached) {
      return cached;
    }

    // Get from ClickHouse
    const timeSeries = await issuesRepository.getIssueTimeSeries(issueId, timeRange);

    // Cache for 2 minutes
    await Cache.set(cacheKey, timeSeries, 2 * 60);

    return timeSeries;
  } catch (error) {
    console.error('Error fetching issue time series:', error);
    return [];
  }
}

export async function getIssuesStats(projectId: string): Promise<{
  total_issues: number;
  unresolved_issues: number;
  resolved_issues: number;
  ignored_issues: number;
}> {
  try {
    // Check cache
    const cacheKey = `issues:stats:${projectId}`;
    const cached = await Cache.get<{
      total_issues: number;
      unresolved_issues: number;
      resolved_issues: number;
      ignored_issues: number;
    }>(cacheKey);

    if (cached) {
      return cached;
    }

    // Get statistics by status
    const [unresolved, resolved, ignored] = await Promise.all([
      getIssues({ project_id: projectId, status: 'unresolved', limit: 1 }),
      getIssues({ project_id: projectId, status: 'resolved', limit: 1 }),
      getIssues({ project_id: projectId, status: 'ignored', limit: 1 }),
    ]);

    const stats = {
      total_issues: unresolved.total + resolved.total + ignored.total,
      unresolved_issues: unresolved.total,
      resolved_issues: resolved.total,
      ignored_issues: ignored.total,
    };

    // Cache for 1 minute
    await Cache.set(cacheKey, stats, 60);

    return stats;
  } catch (error) {
    console.error('Error fetching issues stats:', error);
    return {
      total_issues: 0,
      unresolved_issues: 0,
      resolved_issues: 0,
      ignored_issues: 0,
    };
  }
}

// Function for cache invalidation issues
export async function invalidateIssuesCache(projectId?: string, issueId?: string): Promise<void> {
  try {
    if (issueId) {
      await Cache.del(`issue:${issueId}`);
      await Cache.invalidatePattern(`issue:timeseries:${issueId}:*`);
    }

    if (projectId) {
      await Cache.invalidatePattern(`issues:*:${projectId}*`);
      await Cache.del(`issues:stats:${projectId}`);
    }

    // Invalidate general caches issues
    await Cache.invalidatePattern('issues:*');
    await Cache.invalidatePattern('events:*');
  } catch (error) {
    console.error('Error invalidating issues cache:', error);
  }
}
