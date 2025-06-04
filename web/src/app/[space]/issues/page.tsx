import { Suspense } from 'react';
import { Container, Title, Text, Alert, Group, Badge, Skeleton } from '@mantine/core';
import { getIssues, getIssuesStats } from '../../../lib/data/issues';
import { getProjects } from '../../../lib/data/projects';
import { getSpaceBySlug } from '../../../lib/data/spaces';
import { IssuesTable } from './components/IssuesTable';
import { IssuesFilters } from './components/IssuesFilters';
import { IssuesStats } from './components/IssuesStats';
import { IssuesSearchParams, IssueStatusFilter, IssueLevelFilter, toProjectWithSettings } from '../../../lib/types/database';

interface Props {
  params: Promise<{ space: string }>;
  searchParams: Promise<IssuesSearchParams>;
}

// Helper functions for type-safe parameter conversion
function parseStatusFilter(status?: string): IssueStatusFilter {
  if (!status) return 'all';
  if (status === 'unresolved' || status === 'resolved' || status === 'ignored' || status === 'all') {
    return status;
  }
  return 'all';
}

function parseLevelFilter(level?: string): IssueLevelFilter | undefined {
  if (!level) return undefined;
  if (level === 'error' || level === 'warning' || level === 'info' || level === 'debug') {
    return level;
  }
  return undefined;
}

export default async function IssuesPage({ params, searchParams }: Props) {
  // Await params and searchParams for Next.js 15
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;

  const space = resolvedParams.space || 'demo-org';

  // Get space by slug
  const spaceData = await getSpaceBySlug(space);

  if (!spaceData) {
    throw new Error(`Space not found: ${space}`);
  }

  // Get projects for filtering
  const projects = await getProjects(spaceData.id);

  // Parameters for issues request
  const issuesParams = {
    project_id: resolvedSearchParams.project,
    status: parseStatusFilter(resolvedSearchParams.status),
    environment: resolvedSearchParams.environment,
    level: parseLevelFilter(resolvedSearchParams.level),
    search: resolvedSearchParams.search,
    page: parseInt(resolvedSearchParams.page || '1'),
    limit: 10,
    sort_by: 'last_seen' as const,
    sort_order: 'desc' as const,
  };

  // Get issues and statistics in parallel
  const [issuesResponse, issuesStats] = await Promise.all([
    getIssues(issuesParams),
    getIssuesStats(projects.length > 0 ? projects[0].id : '')
  ]);

  return (
    <Container size="xl" py="xl">
      <Group justify="space-between" mb="xl">
        <div>
          <Title order={1} mb="xs">Issues</Title>
          <Group gap="xs" align="center">
            <Text c="dimmed">
              Track and resolve errors in
            </Text>
            <Badge variant="light">{space}</Badge>
            <Text c="dimmed">
              workspace
            </Text>
          </Group>
        </div>
      </Group>

      {issuesResponse.total > 0 && (
        <Alert color="blue" variant="light" mb="lg">
          <Text fw={500} mb="xs">📊 Issues Overview</Text>
          <Text size="sm">
            Found {issuesResponse.total} issues in your workspace.
          </Text>
        </Alert>
      )}

      <Suspense fallback={<Skeleton height={60} mb="lg" />}>
        <IssuesStats stats={issuesStats} />
      </Suspense>

      <Suspense fallback={<Skeleton height={80} mb="lg" />}>
        <IssuesFilters
          projects={projects.map(toProjectWithSettings)}
          currentFilters={resolvedSearchParams}
          totalIssues={issuesResponse.total}
        />
      </Suspense>

      <Suspense fallback={<Skeleton height={400} />}>
        <IssuesTable
          issuesResponse={issuesResponse}
          space={space}
        />
      </Suspense>
    </Container>
  );
}
