import { notFound } from 'next/navigation';
import {
  Container,
  Title,
  Text,
  Group,
  Badge,
  Card,
  SimpleGrid,
  Breadcrumbs,
  Anchor
} from '@mantine/core';
import {
  IconCode,
  IconBug,
  IconUsers,
  IconActivity,
  IconTrendingUp
} from '@tabler/icons-react';
import Link from 'next/link';
import { getProject, getProjectStats } from '@/lib/data/projects';
import { getIssues } from '@/lib/data/issues';
import { formatDate, formatNumber } from '@/utils/dateFormat';
import { toProjectWithSettings } from '@/lib/types/database';
import { ProjectTabs } from './components/ProjectTabs';

interface Props {
  params: Promise<{ space: string; id: string }>;
  searchParams: Promise<{
    tab?: string;
    timeRange?: string;
  }>;
}

export default async function ProjectPage({ params, searchParams }: Props) {
  const { space, id } = await params;
  const resolvedSearchParams = await searchParams;
  const activeTab = resolvedSearchParams.tab || 'overview';
  const timeRange = resolvedSearchParams.timeRange || '24h';

  // Get project
  const project = await getProject(id);

  if (!project) {
    notFound();
  }

  // Get statistics and issues in parallel
  const [projectStats, recentIssues] = await Promise.all([
    getProjectStats(id, timeRange),
    getIssues({
      project_id: id,
      status: 'unresolved',
      limit: 10,
      sort_by: 'last_seen',
      sort_order: 'desc'
    })
  ]);

  const breadcrumbItems = [
    { title: space, href: `/${space}` },
    { title: 'Projects', href: `/${space}/projects` },
    { title: project.name, href: '#' },
  ].map((item) => (
    <Anchor component={Link} href={item.href} key={item.href}>
      {item.title}
    </Anchor>
  ));

  return (
    <Container size="xl" py="xl">
      {/* Breadcrumbs */}
      <Breadcrumbs mb="md">{breadcrumbItems}</Breadcrumbs>

      {/* Project Header */}
      <Card withBorder radius="md" p="lg" mb="lg">
        <Group justify="space-between" mb="md">
          <Group gap="md">
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: 8,
                backgroundColor: 'var(--mantine-color-blue-1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <IconCode size={28} color="var(--mantine-color-blue-6)" />
            </div>

            <div>
              <Title order={1} mb="xs">{project.name}</Title>
              <Group gap="sm">
                <Badge variant="light" size="lg">
                  {project.platform}
                </Badge>
                {project.framework && (
                  <Badge variant="outline" size="lg">
                    {project.framework}
                  </Badge>
                )}
                <Text c="dimmed">•</Text>
                <Text c="dimmed" size="sm">
                  Created {project.created_at ? formatDate(project.created_at) : 'N/A'}
                </Text>
              </Group>
            </div>
          </Group>
        </Group>

        {project.description && (
          <Text c="dimmed" mb="md">
            {project.description}
          </Text>
        )}

        {/* Quick Stats */}
        <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md">
          <div>
            <Group gap="xs" mb="xs">
              <IconBug size={16} color="red" />
              <Text size="sm" c="dimmed">Issues</Text>
            </Group>
            <Text size="xl" fw={700}>
              {formatNumber(projectStats.unresolved_issues)}
            </Text>
            <Text size="xs" c="dimmed">unresolved</Text>
          </div>

          <div>
            <Group gap="xs" mb="xs">
              <IconActivity size={16} color="blue" />
              <Text size="sm" c="dimmed">Events</Text>
            </Group>
            <Text size="xl" fw={700}>
              {formatNumber(projectStats.total_events)}
            </Text>
            <Text size="xs" c="dimmed">last {timeRange}</Text>
          </div>

          <div>
            <Group gap="xs" mb="xs">
              <IconUsers size={16} color="green" />
              <Text size="sm" c="dimmed">Users</Text>
            </Group>
            <Text size="xl" fw={700}>
              {formatNumber(projectStats.affected_users)}
            </Text>
            <Text size="xs" c="dimmed">affected</Text>
          </div>

          <div>
            <Group gap="xs" mb="xs">
              <IconTrendingUp size={16} color="orange" />
              <Text size="sm" c="dimmed">Error Rate</Text>
            </Group>
            <Text size="xl" fw={700}>
              {projectStats.error_rate.toFixed(1)}%
            </Text>
            <Text size="xs" c="dimmed">
              {projectStats.last_event ? formatDate(projectStats.last_event) : 'No events'}
            </Text>
          </div>
        </SimpleGrid>
      </Card>

      {/* Tabs */}
      <ProjectTabs
        activeTab={activeTab}
        project={toProjectWithSettings(project)}
        projectStats={projectStats}
        recentIssues={recentIssues}
        timeRange={timeRange}
        space={space}
      />
    </Container>
  );
}
