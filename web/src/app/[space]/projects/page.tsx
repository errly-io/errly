import { Suspense } from 'react';
import {
  Container,
  Title,
  Text,
  Group,
  Button,
  Badge,
  Alert
} from '@mantine/core';
import {
  IconPlus
} from '@tabler/icons-react';
import { getProjectsWithStats } from '@/lib/data/projects';
import { toProjectWithSettings } from '@/lib/types/database';
import { ProjectsList } from './components/ProjectsList';
import { ProjectsFilters } from './components/ProjectsFilters';

interface Props {
  params: Promise<{ space: string }>;
  searchParams: Promise<{
    search?: string;
    status?: string;
  }>;
}

export default async function ProjectsPage({ params, searchParams }: Props) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const space = resolvedParams.space || 'default';

  // Get space_id by space (simplified)
  const spaceId = space === 'default'
    ? '00000000-0000-0000-0000-000000000001'
    : space;

  // Get projects with real statistics from databases
  const projectsWithStats = await getProjectsWithStats(spaceId);

  // Filter projects based on search params
  const filteredProjects = projectsWithStats.filter(project => {
    const search = resolvedSearchParams.search?.toLowerCase() || '';
    const status = resolvedSearchParams.status || 'all';

    const matchesSearch = !search ||
      project.name.toLowerCase().includes(search) ||
      project.platform.toLowerCase().includes(search);

    // For status, use the number of unresolved issues
    const matchesStatus = status === 'all' ||
      (status === 'active' && project.stats.unresolved_issues > 0) ||
      (status === 'healthy' && project.stats.unresolved_issues === 0);

    return matchesSearch && matchesStatus;
  });

  return (
    <Container size="lg" py="xl">
      <Group justify="space-between" mb="xl">
        <div>
          <Title order={1} mb="xs">Projects</Title>
          <Group gap="xs" align="center">
            <Text c="dimmed">
              Manage and monitor your applications in
            </Text>
            <Badge variant="light">{space}</Badge>
            <Text c="dimmed">
              workspace
            </Text>
          </Group>
        </div>

        <Button leftSection={<IconPlus size={16} />}>
          Create Project
        </Button>
      </Group>

      <Alert color="green" variant="light" mb="lg">
        <Text fw={500} mb="xs">✅ Real Data</Text>
        <Text size="sm">
          This page now displays real projects from PostgreSQL with statistics from ClickHouse.
          You have {projectsWithStats.length} projects in this workspace.
        </Text>
      </Alert>

      <Suspense fallback={<Text>Loading filters...</Text>}>
        <ProjectsFilters
          currentSearch={resolvedSearchParams.search || ''}
          currentStatus={resolvedSearchParams.status || 'all'}
          totalProjects={projectsWithStats.length}
          filteredCount={filteredProjects.length}
        />
      </Suspense>

      <Suspense fallback={<Text>Loading projects...</Text>}>
        <ProjectsList
          projects={filteredProjects.map(project => ({ ...toProjectWithSettings(project), stats: project.stats }))}
          space={space}
        />
      </Suspense>
    </Container>
  );
}
