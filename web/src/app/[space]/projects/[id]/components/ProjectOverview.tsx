import {
  Grid,
  Card,
  Title,
  Text,
  Group,
  Badge,
  Stack,
  Button,
  Progress,
  SimpleGrid
} from '@mantine/core';
import {
  IconBug,
  IconUsers,
  IconActivity,
  IconTrendingUp,
  IconMinus,
  IconCalendar,
  IconArrowRight,
  IconAlertTriangle,
  IconSettings
} from '@tabler/icons-react';
import Link from 'next/link';
import { formatDate, formatNumber } from '@/utils/dateFormat';
import { ProjectWithSettings, ProjectStats, Issue, PaginatedResponse } from '@/lib/types/database';

interface ProjectOverviewProps {
  project: ProjectWithSettings;
  stats: ProjectStats;
  recentIssues: PaginatedResponse<Issue>;
  timeRange: string;
  space: string;
}

export function ProjectOverview({
  project,
  stats,
  recentIssues,
  timeRange,
  space
}: ProjectOverviewProps) {

  const getHealthColor = () => {
    const errorRate = stats.error_rate;
    if (errorRate === 0) return 'green';
    if (errorRate < 5) return 'yellow';
    if (errorRate < 15) return 'orange';
    return 'red';
  };

  const getHealthScore = () => {
    return Math.max(0, Math.min(100, 100 - stats.error_rate));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'unresolved': return 'red';
      case 'resolved': return 'green';
      case 'ignored': return 'gray';
      default: return 'blue';
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error': return 'red';
      case 'warning': return 'yellow';
      case 'info': return 'blue';
      case 'debug': return 'gray';
      default: return 'blue';
    }
  };

  return (
    <Grid>
      {/* Left Column - Main Stats */}
      <Grid.Col span={{ base: 12, md: 8 }}>
        <Stack gap="lg">
          {/* Health Overview */}
          <Card withBorder radius="md" p="lg">
            <Group justify="space-between" mb="md">
              <Title order={4}>Project Health</Title>
              <Badge
                size="lg"
                variant="light"
                color={getHealthColor()}
              >
                {Math.round(getHealthScore())}% Healthy
              </Badge>
            </Group>

            <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
              <div>
                <Text size="sm" c="dimmed" mb="xs">Error Rate</Text>
                <Group gap="xs" mb="xs">
                  <Text size="xl" fw={700}>
                    {stats.error_rate.toFixed(1)}%
                  </Text>
                  {stats.error_rate > 0 ? (
                    <IconTrendingUp size={16} color="red" />
                  ) : (
                    <IconMinus size={16} color="gray" />
                  )}
                </Group>
                <Progress
                  value={Math.min(stats.error_rate, 100)}
                  color={getHealthColor()}
                  size="sm"
                />
              </div>

              <div>
                <Text size="sm" c="dimmed" mb="xs">Total Events</Text>
                <Text size="xl" fw={700} mb="xs">
                  {formatNumber(stats.total_events)}
                </Text>
                <Text size="xs" c="dimmed">
                  in last {timeRange}
                </Text>
              </div>

              <div>
                <Text size="sm" c="dimmed" mb="xs">Affected Users</Text>
                <Text size="xl" fw={700} mb="xs">
                  {formatNumber(stats.affected_users)}
                </Text>
                <Text size="xs" c="dimmed">
                  unique users
                </Text>
              </div>
            </SimpleGrid>
          </Card>

          {/* Recent Issues */}
          <Card withBorder radius="md" p="lg">
            <Group justify="space-between" mb="md">
              <Title order={4}>Recent Issues</Title>
              <Button
                variant="light"
                size="sm"
                rightSection={<IconArrowRight size={16} />}
                component={Link}
                href={`/${space}/projects/${project.id}?tab=issues`}
              >
                View All
              </Button>
            </Group>

            {recentIssues.data.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <IconBug size={48} color="var(--mantine-color-gray-5)" style={{ margin: '0 auto 1rem' }} />
                <Text c="dimmed">No recent issues</Text>
                <Text size="sm" c="dimmed">
                  Your project is running smoothly!
                </Text>
              </div>
            ) : (
              <Stack gap="md">
                {recentIssues.data.slice(0, 5).map((issue) => (
                  <Card
                    key={issue.id}
                    withBorder
                    radius="sm"
                    p="md"
                    style={{ cursor: 'pointer' }}
                    component={Link}
                    href={`/${space}/issues/${issue.id}`}
                  >
                    <Group justify="space-between" mb="xs">
                      <Group gap="xs">
                        <Badge
                          size="sm"
                          variant="light"
                          color={getLevelColor(issue.level)}
                        >
                          {issue.level}
                        </Badge>
                        <Badge
                          size="sm"
                          variant="light"
                          color={getStatusColor(issue.status)}
                        >
                          {issue.status}
                        </Badge>
                      </Group>

                      <Text size="xs" c="dimmed">
                        {formatDate(issue.last_seen)}
                      </Text>
                    </Group>

                    <Text size="sm" fw={500} lineClamp={1} mb="xs">
                      {issue.message}
                    </Text>

                    <Group gap="md">
                      <Group gap="xs">
                        <IconActivity size={14} />
                        <Text size="xs" c="dimmed">
                          {formatNumber(issue.event_count)} events
                        </Text>
                      </Group>

                      <Group gap="xs">
                        <IconUsers size={14} />
                        <Text size="xs" c="dimmed">
                          {formatNumber(issue.user_count)} users
                        </Text>
                      </Group>

                      {issue.environments.length > 0 && (
                        <Badge size="xs" variant="dot">
                          {issue.environments[0]}
                        </Badge>
                      )}
                    </Group>
                  </Card>
                ))}
              </Stack>
            )}
          </Card>
        </Stack>
      </Grid.Col>

      {/* Right Column - Project Info */}
      <Grid.Col span={{ base: 12, md: 4 }}>
        <Stack gap="lg">
          {/* Project Info */}
          <Card withBorder radius="md" p="lg">
            <Title order={4} mb="md">Project Information</Title>

            <Stack gap="md">
              <div>
                <Text size="sm" c="dimmed" mb="xs">Platform</Text>
                <Badge variant="light" size="md">
                  {project.platform}
                </Badge>
              </div>

              {project.framework && (
                <div>
                  <Text size="sm" c="dimmed" mb="xs">Framework</Text>
                  <Badge variant="outline" size="md">
                    {project.framework}
                  </Badge>
                </div>
              )}

              <div>
                <Text size="sm" c="dimmed" mb="xs">Environments</Text>
                <Group gap="xs">
                  {project.settings?.environments?.map((env: string) => (
                    <Badge key={env} size="sm" variant="dot">
                      {env}
                    </Badge>
                  ))}
                </Group>
              </div>

              <div>
                <Text size="sm" c="dimmed" mb="xs">Created</Text>
                <Group gap="xs">
                  <IconCalendar size={14} />
                  <Text size="sm">
                    {project.created_at ? formatDate(project.created_at) : 'N/A'}
                  </Text>
                </Group>
              </div>

              <div>
                <Text size="sm" c="dimmed" mb="xs">Last Updated</Text>
                <Group gap="xs">
                  <IconCalendar size={14} />
                  <Text size="sm">
                    {project.updated_at ? formatDate(project.updated_at) : 'N/A'}
                  </Text>
                </Group>
              </div>
            </Stack>
          </Card>

          {/* Quick Actions */}
          <Card withBorder radius="md" p="lg">
            <Title order={4} mb="md">Quick Actions</Title>

            <Stack gap="sm">
              <Button
                variant="light"
                fullWidth
                leftSection={<IconBug size={16} />}
                component={Link}
                href={`/${space}/issues?project=${project.id}`}
              >
                View All Issues
              </Button>

              <Button
                variant="light"
                fullWidth
                leftSection={<IconSettings size={16} />}
                component={Link}
                href={`/${space}/projects/${project.id}?tab=settings`}
              >
                Project Settings
              </Button>

              <Button
                variant="light"
                fullWidth
                leftSection={<IconActivity size={16} />}
                disabled
              >
                View Analytics
              </Button>
            </Stack>
          </Card>

          {/* Alerts */}
          {stats.unresolved_issues > 10 && (
            <Card withBorder radius="md" p="lg" bg="red.0">
              <Group gap="xs" mb="xs">
                <IconAlertTriangle size={16} color="red" />
                <Text size="sm" fw={500} c="red">
                  High Issue Count
                </Text>
              </Group>
              <Text size="sm" c="dimmed">
                This project has {stats.unresolved_issues} unresolved issues.
                Consider reviewing and resolving them.
              </Text>
            </Card>
          )}
        </Stack>
      </Grid.Col>
    </Grid>
  );
}
