import { clickhouse, queryMany, queryOne, getTimeRangeCondition } from '@/lib/db/clickhouse';
import { Issue, ErrorEvent, IssuesQueryParams, EventsQueryParams, ProjectStats, PaginatedResponse } from '@/lib/types/database';

export class IssuesRepository {

  async getIssues(params: IssuesQueryParams): Promise<PaginatedResponse<Issue>> {
    const {
      project_id,
      status = 'all',
      environment,
      level,
      search,
      time_range = '24h',
      page = 1,
      limit = 50,
      sort_by = 'last_seen',
      sort_order = 'desc'
    } = params;

    // Build WHERE conditions (using direct substitutions to avoid parameter issues)
    const conditions = [];

    if (project_id) {
      conditions.push(`project_id = '${project_id}'`);
    }

    if (status !== 'all') {
      conditions.push(`status = '${status}'`);
    }

    if (environment && environment !== 'all') {
      conditions.push(`has(environments, '${environment}')`);
    }

    if (level) {
      conditions.push(`level = '${level}'`);
    }

    if (search) {
      // Escape search query
      const escapedSearch = search.replace(/'/g, "\\'");
      conditions.push(`positionCaseInsensitive(message, '${escapedSearch}') > 0`);
    }

    // Add time filter for issues table
    conditions.push(getTimeRangeCondition(time_range, 'issues'));

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count total records
    const countQuery = `
      SELECT count() as total
      FROM issues
      ${whereClause}
    `;

    const totalResult = await queryOne<{ total: number }>(countQuery);
    const total = totalResult?.total ?? 0;

    // Main query with pagination
    const offset = (page - 1) * limit;

    const dataQuery = `
      SELECT
        id,
        project_id,
        fingerprint,
        message,
        level,
        status,
        first_seen,
        last_seen,
        event_count,
        user_count,
        environments,
        tags
      FROM issues
      ${whereClause}
      ORDER BY ${sort_by} ${sort_order.toUpperCase()}
      LIMIT ${limit} OFFSET ${offset}
    `;

    const issues = await queryMany<Issue>(dataQuery);

    return {
      data: issues,
      total,
      page,
      limit,
      has_next: offset + limit < total,
      has_prev: page > 1,
    };
  }

  async getIssueById(id: string): Promise<Issue | null> {
    const query = `
      SELECT
        id,
        project_id,
        fingerprint,
        message,
        level,
        status,
        first_seen,
        last_seen,
        event_count,
        user_count,
        environments,
        tags
      FROM issues
      WHERE id = '${id}'
      LIMIT 1
    `;

    return queryOne<Issue>(query);
  }

  async getEvents(params: EventsQueryParams): Promise<PaginatedResponse<ErrorEvent>> {
    const {
      issue_id,
      project_id,
      environment,
      user_id,
      time_range = '24h',
      page = 1,
      limit = 100
    } = params;

    const conditions = [];

    if (issue_id) {
      // Get fingerprint by issue_id
      const issue = await this.getIssueById(issue_id);
      if (issue) {
        conditions.push(`fingerprint = '${issue.fingerprint}'`);
      }
    }

    if (project_id) {
      conditions.push(`project_id = '${project_id}'`);
    }

    if (environment && environment !== 'all') {
      conditions.push(`environment = '${environment}'`);
    }

    if (user_id) {
      conditions.push(`user_id = '${user_id}'`);
    }

    conditions.push(getTimeRangeCondition(time_range, 'error_events'));

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count total records
    const countQuery = `
      SELECT count() as total
      FROM error_events
      ${whereClause}
    `;

    const totalResult = await queryOne<{ total: number }>(countQuery);
    const total = totalResult?.total ?? 0;

    // Main query
    const offset = (page - 1) * limit;

    const dataQuery = `
      SELECT
        id,
        project_id,
        timestamp,
        message,
        stack_trace,
        environment,
        release_version,
        user_id,
        user_email,
        user_ip,
        browser,
        os,
        url,
        tags,
        extra,
        fingerprint,
        level
      FROM error_events
      ${whereClause}
      ORDER BY timestamp DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const events = await queryMany<ErrorEvent>(dataQuery);

    return {
      data: events,
      total,
      page,
      limit,
      has_next: offset + limit < total,
      has_prev: page > 1,
    };
  }

  async getProjectStats(projectId: string, timeRange = '24h'): Promise<ProjectStats> {
    const timeCondition = getTimeRangeCondition(timeRange, 'error_events');

    const query = `
      SELECT
        '${projectId}' as project_id,
        count() as total_events,
        uniq(fingerprint) as total_issues,
        countIf(level = 'error') as unresolved_issues,
        uniq(user_id) as affected_users,
        max(timestamp) as last_event
      FROM error_events
      WHERE project_id = '${projectId}' AND ${timeCondition}
    `;

    const result = await queryOne<ProjectStats>(query);

    if (!result) {
      return {
        project_id: projectId,
        total_events: 0,
        total_issues: 0,
        unresolved_issues: 0,
        affected_users: 0,
        error_rate: 0,
        last_event: null
      };
    }

    return {
      ...result,
      error_rate: result.total_events > 0 ? (result.unresolved_issues / result.total_issues) * 100 : 0
    };
  }

  async updateIssueStatus(issueId: string, status: 'resolved' | 'ignored' | 'unresolved'): Promise<boolean> {
    // ClickHouse uses special syntax for updates with SETTINGS mutations_sync = 1
    // Don't update updated_at as ClickHouse doesn't allow updating DEFAULT columns
    const query = `
      ALTER TABLE errly_events.issues
      UPDATE status = '${status}'
      WHERE id = '${issueId}'
      SETTINGS mutations_sync = 1
    `;

    try {
      await clickhouse.query({ query });
      return true;
    } catch (error) {
      console.error('Failed to update issue status:', error);
      return false;
    }
  }

  async getIssueTimeSeries(issueId: string, timeRange = '24h'): Promise<Array<{ timestamp: Date; count: number }>> {
    const issue = await this.getIssueById(issueId);
    if (!issue) return [];

    const timeCondition = getTimeRangeCondition(timeRange, 'error_events');

    const query = `
      SELECT
        toStartOfHour(timestamp) as timestamp,
        count() as count
      FROM error_events
      WHERE fingerprint = '${issue.fingerprint}' AND ${timeCondition}
      GROUP BY timestamp
      ORDER BY timestamp
    `;

    return queryMany<{ timestamp: Date; count: number }>(query);
  }
}

export const issuesRepository = new IssuesRepository();
