import { Suspense } from 'react';
import {
  Card,
  Title,
  Text,
  Group,
  Badge,
  Stack,
  Button,
  Skeleton,
  SimpleGrid
} from '@mantine/core';
import {
  IconBug,
  IconCheck,
  IconEyeOff,
  IconAlertTriangle,
  IconFilter
} from '@tabler/icons-react';
import Link from 'next/link';
import { getIssues, getIssuesStats } from '@/lib/data/issues';
import { IssuesTable } from '../../../issues/components/IssuesTable';

interface ProjectIssuesProps {
  projectId: string;
  space: string;
}

export async function ProjectIssues({ projectId, space }: ProjectIssuesProps) {
  // Get issues and statistics for project
  const [issuesResponse, issuesStats] = await Promise.all([
    getIssues({
      project_id: projectId,
      status: 'all',
      limit: 25,
      sort_by: 'last_seen',
      sort_order: 'desc'
    }),
    getIssuesStats(projectId)
  ]);

  return (
    <Stack gap="lg">
      {/* Issues Stats */}
      <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md">
        <Card withBorder radius="md" p="md">
          <Group justify="space-between" mb="xs">
            <Text size="sm" c="dimmed" fw={500}>
              Total Issues
            </Text>
            <IconBug size={20} color="var(--mantine-color-blue-6)" />
          </Group>

          <Text size="xl" fw={700}>
            {issuesStats.total_issues}
          </Text>
        </Card>

        <Card withBorder radius="md" p="md">
          <Group justify="space-between" mb="xs">
            <Text size="sm" c="dimmed" fw={500}>
              Unresolved
            </Text>
            <IconAlertTriangle size={20} color="var(--mantine-color-red-6)" />
          </Group>

          <Group align="baseline" gap="xs">
            <Text size="xl" fw={700}>
              {issuesStats.unresolved_issues}
            </Text>
            {issuesStats.unresolved_issues > 0 && (
              <Badge size="xs" color="red" variant="light">
                Needs attention
              </Badge>
            )}
          </Group>
        </Card>

        <Card withBorder radius="md" p="md">
          <Group justify="space-between" mb="xs">
            <Text size="sm" c="dimmed" fw={500}>
              Resolved
            </Text>
            <IconCheck size={20} color="var(--mantine-color-green-6)" />
          </Group>

          <Text size="xl" fw={700}>
            {issuesStats.resolved_issues}
          </Text>
        </Card>

        <Card withBorder radius="md" p="md">
          <Group justify="space-between" mb="xs">
            <Text size="sm" c="dimmed" fw={500}>
              Ignored
            </Text>
            <IconEyeOff size={20} color="var(--mantine-color-gray-6)" />
          </Group>

          <Text size="xl" fw={700}>
            {issuesStats.ignored_issues}
          </Text>
        </Card>
      </SimpleGrid>

      {/* Quick Filters */}
      <Card withBorder radius="md" p="md">
        <Group justify="space-between">
          <Group gap="md">
            <Text size="sm" fw={500}>Quick Filters:</Text>
            <Button
              variant="light"
              size="xs"
              leftSection={<IconAlertTriangle size={14} />}
              component={Link}
              href={`/${space}/issues?project=${projectId}&status=unresolved`}
            >
              Unresolved ({issuesStats.unresolved_issues})
            </Button>
            <Button
              variant="light"
              size="xs"
              leftSection={<IconCheck size={14} />}
              component={Link}
              href={`/${space}/issues?project=${projectId}&status=resolved`}
            >
              Resolved ({issuesStats.resolved_issues})
            </Button>
            <Button
              variant="light"
              size="xs"
              leftSection={<IconEyeOff size={14} />}
              component={Link}
              href={`/${space}/issues?project=${projectId}&status=ignored`}
            >
              Ignored ({issuesStats.ignored_issues})
            </Button>
          </Group>

          <Button
            variant="outline"
            size="sm"
            leftSection={<IconFilter size={16} />}
            component={Link}
            href={`/${space}/issues?project=${projectId}`}
          >
            Advanced Filters
          </Button>
        </Group>
      </Card>

      {/* Issues Table */}
      <Card withBorder radius="md" p={0}>
        <div style={{ padding: '1rem 1rem 0 1rem' }}>
          <Group justify="space-between" mb="md">
            <Title order={4}>All Issues</Title>
            <Text size="sm" c="dimmed">
              {issuesResponse.total} total issues
            </Text>
          </Group>
        </div>

        <Suspense fallback={<Skeleton height={400} />}>
          <IssuesTable
            issuesResponse={issuesResponse}
            space={space}
          />
        </Suspense>
      </Card>

      {/* Empty State */}
      {issuesResponse.total === 0 && (
        <Card withBorder radius="md" p="xl" style={{ textAlign: 'center' }}>
          <IconBug size={48} color="var(--mantine-color-gray-5)" style={{ margin: '0 auto 1rem' }} />
          <Title order={4} mb="xs">No Issues Found</Title>
          <Text c="dimmed" mb="lg">
            This project doesn't have any issues yet. That's great news!
          </Text>
          <Text size="sm" c="dimmed">
            Issues will appear here when errors are reported from your application.
          </Text>
        </Card>
      )}
    </Stack>
  );
}
