'use client';

import { useRouter } from 'next/navigation';
import {
  Grid,
  Card,
  Group,
  Avatar,
  Text,
  Menu,
  ActionIcon,
  Badge,
  Stack,
  Button,
  Title,
  Progress
} from '@mantine/core';
import {
  IconCode,
  IconDots,
  IconEye,
  IconSettings,
  IconTrash,
  IconBug,
  IconUsers,
  IconCalendar,
  IconAlertTriangle,
  IconPlus
} from '@tabler/icons-react';
import { formatDate, formatNumber } from '@/utils/dateFormat';
import { ProjectWithSettings, ProjectStats } from '@/lib/types/database';

interface ProjectsListProps {
  projects: Array<ProjectWithSettings & { stats: ProjectStats }>;
  space: string;
}

export function ProjectsList({ projects, space }: ProjectsListProps) {
  const router = useRouter();

  const getHealthColor = (stats: ProjectStats) => {
    const errorRate = stats.error_rate;
    if (errorRate === 0) return 'green';
    if (errorRate < 10) return 'yellow';
    return 'red';
  };

  const getHealthScore = (stats: ProjectStats) => {
    const errorRate = stats.error_rate;
    return Math.max(0, Math.min(100, 100 - errorRate));
  };

  const handleProjectClick = (projectId: string) => {
    router.push(`/${space}/projects/${projectId}`);
  };

  if (projects.length === 0) {
    return (
      <Card withBorder radius="md" p="xl" style={{ textAlign: 'center' }}>
        <IconAlertTriangle size={48} color="var(--mantine-color-gray-5)" style={{ margin: '0 auto 1rem' }} />
        <Title order={4} mb="xs">No projects found</Title>
        <Text c="dimmed" mb="lg">
          Create your first project to start tracking errors and performance.
        </Text>
        <Button leftSection={<IconPlus size={16} />}>
          Create Your First Project
        </Button>
      </Card>
    );
  }

  return (
    <Grid>
      {projects.map((project) => (
        <Grid.Col key={project.id} span={{ base: 12, md: 6 }}>
          <Card
            withBorder
            radius="md"
            p="lg"
            h="100%"
            style={{
              cursor: 'pointer',
              transition: 'transform 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
            }}
            onClick={() => handleProjectClick(project.id)}
          >
            <Group justify="space-between" mb="md">
              <Group gap="sm">
                <Avatar size={40} radius="md" color="blue">
                  <IconCode size={20} />
                </Avatar>
                <div>
                  <Text fw={600} size="lg">{project.name}</Text>
                  <Text size="sm" c="dimmed">
                    {project.platform}
                    {project.framework && ` • ${project.framework}`}
                  </Text>
                </div>
              </Group>

              <Menu shadow="md" width={200}>
                <Menu.Target>
                  <ActionIcon
                    variant="subtle"
                    color="gray"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <IconDots size={16} />
                  </ActionIcon>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Item
                    leftSection={<IconEye size={16} />}
                    onClick={() => handleProjectClick(project.id)}
                  >
                    View Details
                  </Menu.Item>
                  <Menu.Item leftSection={<IconSettings size={16} />}>
                    Settings
                  </Menu.Item>
                  <Menu.Divider />
                  <Menu.Item leftSection={<IconTrash size={16} />} color="red">
                    Delete Project
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
            </Group>

            {project.description && (
              <Text size="sm" c="dimmed" mb="md" lineClamp={2}>
                {project.description}
              </Text>
            )}

            <Stack gap="sm" mb="md">
              <Group justify="space-between">
                <Group gap="xs">
                  <Badge
                    variant="light"
                    color={project.stats.unresolved_issues > 0 ? 'red' : 'green'}
                    size="sm"
                  >
                    {project.stats.unresolved_issues > 0 ? 'Has Issues' : 'Healthy'}
                  </Badge>
                  <Badge variant="outline" size="sm">
                    {formatNumber(project.stats.total_events)} events
                  </Badge>
                </Group>

                <Group gap="xs">
                  <IconBug size={16} color="red" />
                  <Text size="sm" fw={500}>
                    {formatNumber(project.stats.unresolved_issues)}
                  </Text>
                </Group>
              </Group>

              <Group justify="space-between">
                <Group gap="xs">
                  <Text size="xs" c="dimmed">Health:</Text>
                  <Progress
                    value={getHealthScore(project.stats)}
                    size="sm"
                    color={getHealthColor(project.stats)}
                    style={{ width: 60 }}
                  />
                  <Text size="xs" fw={500}>
                    {Math.round(getHealthScore(project.stats))}%
                  </Text>
                </Group>

                <Group gap="xs">
                  <IconUsers size={16} />
                  <Text size="sm">
                    {formatNumber(project.stats.affected_users)} users
                  </Text>
                </Group>
              </Group>

              <Group justify="space-between">
                <Group gap="xs">
                  <IconCalendar size={16} />
                  <Text size="xs" c="dimmed">
                    Last event: {project.stats.last_event ? formatDate(project.stats.last_event) : 'Never'}
                  </Text>
                </Group>

                <Group gap={4}>
                  {project.settings?.environments?.map((env: string) => (
                    <Badge key={env} size="xs" variant="dot">
                      {env}
                    </Badge>
                  ))}
                </Group>
              </Group>
            </Stack>

            <Button
              variant="light"
              fullWidth
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleProjectClick(project.id);
              }}
            >
              Open Project
            </Button>
          </Card>
        </Grid.Col>
      ))}
    </Grid>
  );
}
