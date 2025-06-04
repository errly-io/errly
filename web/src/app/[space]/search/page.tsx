'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

// Types for search results
interface SearchIssue {
  id: string;
  title: string;
  description: string;
  project: string;
  status: string;
  createdAt: Date;
  assignee: string;
}

interface SearchProject {
  id: string;
  name: string;
  description: string;
  platform: string;
  status: string;
}

interface SearchEvent {
  id: string;
  message: string;
  project: string;
  timestamp: Date;
  level: string;
}

interface SearchResults {
  issues: SearchIssue[];
  projects: SearchProject[];
  events: SearchEvent[];
}
import {
  Container,
  Title,
  Text,
  Card,
  Group,
  Badge,
  Stack,
  Alert,
  TextInput,
  Tabs
} from '@mantine/core';
import {
  IconSearch,
  IconBug,
  IconApps,
  IconCode,
  IconAlertTriangle,
  IconCalendar,
  IconUser
} from '@tabler/icons-react';
import { formatDate, formatDateTime } from '@/utils/dateFormat';

export default function SearchPage() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';

  const [searchQuery, setSearchQuery] = useState(query);
  const [activeTab, setActiveTab] = useState<string | null>('all');

  useEffect(() => {
    setSearchQuery(query);
  }, [query]);

  // TODO: Implement real search functionality
  const results: SearchResults = {
    issues: [],
    projects: [],
    events: []
  };

  const totalResults = results.issues.length + results.projects.length + results.events.length;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'red';
      case 'in-progress': return 'yellow';
      case 'resolved': return 'green';
      case 'active': return 'green';
      default: return 'gray';
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error': return 'red';
      case 'warning': return 'yellow';
      case 'info': return 'blue';
      default: return 'gray';
    }
  };

  return (
    <Container size="lg" py="xl">
      <Group justify="space-between" mb="xl">
        <div>
          <Title order={1} mb="xs">Search Results</Title>
          <Text c="dimmed">
            {query ? `Found ${totalResults} results for "${query}"` : 'Enter a search query to find issues, projects, and events'}
          </Text>
        </div>
      </Group>

      <Alert color="blue" variant="light" mb="lg">
        <Text fw={500} mb="xs">Search</Text>
        <Text size="sm">
          Search functionality will be implemented when backend is ready.
        </Text>
      </Alert>

      {/* Search Input */}
      <Card withBorder radius="md" p="md" mb="lg">
        <TextInput
          placeholder="Search issues, projects, events..."
          leftSection={<IconSearch size={16} />}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          size="md"
        />
      </Card>

      {query && (
        <Tabs value={activeTab} onChange={setActiveTab}>
          <Tabs.List>
            <Tabs.Tab value="all">
              All ({totalResults})
            </Tabs.Tab>
            <Tabs.Tab value="issues" leftSection={<IconBug size={16} />}>
              Issues ({results.issues.length})
            </Tabs.Tab>
            <Tabs.Tab value="projects" leftSection={<IconApps size={16} />}>
              Projects ({results.projects.length})
            </Tabs.Tab>
            <Tabs.Tab value="events" leftSection={<IconCode size={16} />}>
              Events ({results.events.length})
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="all" pt="lg">
            <Stack gap="md">
              {/* Issues */}
              {results.issues.length > 0 && (
                <div>
                  <Title order={4} mb="md">Issues</Title>
                  {results.issues.map((issue) => (
                    <Card key={issue.id} withBorder radius="md" p="md" mb="sm">
                      <Group justify="space-between" mb="xs">
                        <Group gap="sm">
                          <IconBug size={16} color="red" />
                          <Text fw={600}>{issue.title}</Text>
                          <Badge variant="light" color={getStatusColor(issue.status)} size="sm">
                            {issue.status}
                          </Badge>
                        </Group>
                        <Text size="sm" c="dimmed">{issue.id}</Text>
                      </Group>
                      <Text size="sm" c="dimmed" mb="xs">{issue.description}</Text>
                      <Group gap="sm">
                        <Badge variant="outline" size="xs">{issue.project}</Badge>
                        <Group gap="xs">
                          <IconUser size={12} />
                          <Text size="xs">{issue.assignee}</Text>
                        </Group>
                        <Group gap="xs">
                          <IconCalendar size={12} />
                          <Text size="xs">{formatDate(issue.createdAt)}</Text>
                        </Group>
                      </Group>
                    </Card>
                  ))}
                </div>
              )}

              {/* Projects */}
              {results.projects.length > 0 && (
                <div>
                  <Title order={4} mb="md">Projects</Title>
                  {results.projects.map((project) => (
                    <Card key={project.id} withBorder radius="md" p="md" mb="sm">
                      <Group justify="space-between" mb="xs">
                        <Group gap="sm">
                          <IconApps size={16} color="blue" />
                          <Text fw={600}>{project.name}</Text>
                          <Badge variant="light" color={getStatusColor(project.status)} size="sm">
                            {project.status}
                          </Badge>
                        </Group>
                        <Badge variant="outline" size="sm">{project.platform}</Badge>
                      </Group>
                      <Text size="sm" c="dimmed">{project.description}</Text>
                    </Card>
                  ))}
                </div>
              )}

              {/* Events */}
              {results.events.length > 0 && (
                <div>
                  <Title order={4} mb="md">Events</Title>
                  {results.events.map((event) => (
                    <Card key={event.id} withBorder radius="md" p="md" mb="sm">
                      <Group justify="space-between" mb="xs">
                        <Group gap="sm">
                          <IconCode size={16} color="orange" />
                          <Text fw={600} lineClamp={1}>{event.message}</Text>
                          <Badge variant="light" color={getLevelColor(event.level)} size="sm">
                            {event.level}
                          </Badge>
                        </Group>
                        <Text size="sm" c="dimmed">{formatDateTime(event.timestamp)}</Text>
                      </Group>
                      <Badge variant="outline" size="xs">{event.project}</Badge>
                    </Card>
                  ))}
                </div>
              )}
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="issues" pt="lg">
            <Stack gap="md">
              {results.issues.length > 0 ? results.issues.map((issue) => (
                <Card key={issue.id} withBorder radius="md" p="md">
                  <Group justify="space-between" mb="xs">
                    <Group gap="sm">
                      <IconBug size={16} color="red" />
                      <Text fw={600}>{issue.title}</Text>
                      <Badge variant="light" color={getStatusColor(issue.status)} size="sm">
                        {issue.status}
                      </Badge>
                    </Group>
                    <Text size="sm" c="dimmed">{issue.id}</Text>
                  </Group>
                  <Text size="sm" c="dimmed" mb="xs">{issue.description}</Text>
                  <Group gap="sm">
                    <Badge variant="outline" size="xs">{issue.project}</Badge>
                    <Group gap="xs">
                      <IconUser size={12} />
                      <Text size="xs">{issue.assignee}</Text>
                    </Group>
                    <Group gap="xs">
                      <IconCalendar size={12} />
                      <Text size="xs">{formatDate(issue.createdAt)}</Text>
                    </Group>
                  </Group>
                </Card>
              )) : (
                <Text c="dimmed" ta="center" py="xl">No issues found</Text>
              )}
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="projects" pt="lg">
            <Stack gap="md">
              {results.projects.length > 0 ? results.projects.map((project) => (
                <Card key={project.id} withBorder radius="md" p="md">
                  <Group justify="space-between" mb="xs">
                    <Group gap="sm">
                      <IconApps size={16} color="blue" />
                      <Text fw={600}>{project.name}</Text>
                      <Badge variant="light" color={getStatusColor(project.status)} size="sm">
                        {project.status}
                      </Badge>
                    </Group>
                    <Badge variant="outline" size="sm">{project.platform}</Badge>
                  </Group>
                  <Text size="sm" c="dimmed">{project.description}</Text>
                </Card>
              )) : (
                <Text c="dimmed" ta="center" py="xl">No projects found</Text>
              )}
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="events" pt="lg">
            <Stack gap="md">
              {results.events.length > 0 ? results.events.map((event) => (
                <Card key={event.id} withBorder radius="md" p="md">
                  <Group justify="space-between" mb="xs">
                    <Group gap="sm">
                      <IconCode size={16} color="orange" />
                      <Text fw={600} lineClamp={1}>{event.message}</Text>
                      <Badge variant="light" color={getLevelColor(event.level)} size="sm">
                        {event.level}
                      </Badge>
                    </Group>
                    <Text size="sm" c="dimmed">{formatDateTime(event.timestamp)}</Text>
                  </Group>
                  <Badge variant="outline" size="xs">{event.project}</Badge>
                </Card>
              )) : (
                <Text c="dimmed" ta="center" py="xl">No events found</Text>
              )}
            </Stack>
          </Tabs.Panel>
        </Tabs>
      )}

      {query && totalResults === 0 && (
        <Card withBorder radius="md" p="xl" style={{ textAlign: 'center' }}>
          <IconAlertTriangle size={48} color="var(--mantine-color-gray-5)" style={{ margin: '0 auto 1rem' }} />
          <Title order={4} mb="xs">No results found</Title>
          <Text c="dimmed" mb="lg">
            No issues, projects, or events match your search query "{query}".
          </Text>
          <Text size="sm" c="dimmed">
            Try using different keywords or check your spelling.
          </Text>
        </Card>
      )}
    </Container>
  );
}
