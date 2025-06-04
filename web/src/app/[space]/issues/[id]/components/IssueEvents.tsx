'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  Title,
  Text,
  Stack,
  Group,
  Badge,
  Collapse,
  Button,
  Code,
  Pagination,
  Divider
} from '@mantine/core';
import {
  IconChevronDown,
  IconChevronRight,
  IconCalendar,
  IconUser,
  IconGlobe,
  IconDeviceDesktop,
  IconBrowser
} from '@tabler/icons-react';
import { formatDate } from '@/utils/dateFormat';
import { ErrorEvent, PaginatedResponse } from '@/lib/types/database';

interface IssueEventsProps {
  eventsResponse: PaginatedResponse<ErrorEvent>;
  space: string;
  issueId: string;
}

export function IssueEvents({ eventsResponse, space: _space, issueId: _issueId }: IssueEventsProps) {
  const router = useRouter();
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());

  const { data: events, total, page, limit } = eventsResponse;

  const toggleEventExpansion = (eventId: string) => {
    const newExpanded = new Set(expandedEvents);
    if (newExpanded.has(eventId)) {
      newExpanded.delete(eventId);
    } else {
      newExpanded.add(eventId);
    }
    setExpandedEvents(newExpanded);
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(window.location.search);
    params.set('events_page', newPage.toString());
    router.push(`?${params.toString()}`, { scroll: false });
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
    <Card withBorder radius="md" p="lg">
      <Group justify="space-between" mb="lg">
        <Title order={4}>Recent Events</Title>
        <Text size="sm" c="dimmed">
          {total} total events
        </Text>
      </Group>

      {events.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <Text c="dimmed">No events found for this issue</Text>
        </div>
      ) : (
        <Stack gap="md">
          {events.map((event, index) => {
            const isExpanded = expandedEvents.has(event.id);

            return (
              <div key={event.id}>
                <Card withBorder radius="sm" p="md">
                  <Group justify="space-between" mb="sm">
                    <Group gap="xs">
                      <Badge
                        size="sm"
                        variant="light"
                        color={getLevelColor(event.level)}
                      >
                        {event.level}
                      </Badge>
                      <Badge size="sm" variant="outline">
                        {event.environment}
                      </Badge>
                      {event.release_version && (
                        <Badge size="sm" variant="dot">
                          {event.release_version}
                        </Badge>
                      )}
                    </Group>

                    <Group gap="xs">
                      <IconCalendar size={14} />
                      <Text size="xs" c="dimmed">
                        {formatDate(event.timestamp)}
                      </Text>
                    </Group>
                  </Group>

                  <Text size="sm" fw={500} mb="sm" lineClamp={2}>
                    {event.message}
                  </Text>

                  {/* Event metadata */}
                  <Group gap="md" mb="sm">
                    {event.user_email && (
                      <Group gap="xs">
                        <IconUser size={14} />
                        <Text size="xs" c="dimmed">
                          {event.user_email}
                        </Text>
                      </Group>
                    )}

                    {event.url && (
                      <Group gap="xs">
                        <IconGlobe size={14} />
                        <Text size="xs" c="dimmed" lineClamp={1}>
                          {event.url}
                        </Text>
                      </Group>
                    )}

                    {event.browser && (
                      <Group gap="xs">
                        <IconBrowser size={14} />
                        <Text size="xs" c="dimmed">
                          {event.browser}
                        </Text>
                      </Group>
                    )}

                    {event.os && (
                      <Group gap="xs">
                        <IconDeviceDesktop size={14} />
                        <Text size="xs" c="dimmed">
                          {event.os}
                        </Text>
                      </Group>
                    )}
                  </Group>

                  {/* Expand/Collapse button */}
                  <Button
                    variant="subtle"
                    size="xs"
                    leftSection={
                      isExpanded ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />
                    }
                    onClick={() => toggleEventExpansion(event.id)}
                  >
                    {isExpanded ? 'Hide Details' : 'Show Details'}
                  </Button>

                  {/* Expanded content */}
                  <Collapse in={isExpanded}>
                    <Divider my="md" />

                    {/* Stack trace */}
                    {event.stack_trace && (
                      <div style={{ marginBottom: '1rem' }}>
                        <Text size="sm" fw={500} mb="xs">Stack Trace:</Text>
                        <Code block style={{ fontSize: '11px', maxHeight: '200px', overflow: 'auto' }}>
                          {event.stack_trace}
                        </Code>
                      </div>
                    )}

                    {/* Tags */}
                    {Object.keys(event.tags).length > 0 && (
                      <div style={{ marginBottom: '1rem' }}>
                        <Text size="sm" fw={500} mb="xs">Tags:</Text>
                        <Group gap="xs">
                          {Object.entries(event.tags).map(([key, value]) => (
                            <Badge key={key} size="xs" variant="outline">
                              {key}: {value}
                            </Badge>
                          ))}
                        </Group>
                      </div>
                    )}

                    {/* Extra data */}
                    {Object.keys(event.extra).length > 0 && (
                      <div>
                        <Text size="sm" fw={500} mb="xs">Additional Data:</Text>
                        <Code block style={{ fontSize: '11px', maxHeight: '150px', overflow: 'auto' }}>
                          {JSON.stringify(event.extra, null, 2)}
                        </Code>
                      </div>
                    )}
                  </Collapse>
                </Card>

                {index < events.length - 1 && <Divider />}
              </div>
            );
          })}
        </Stack>
      )}

      {/* Pagination */}
      {total > limit && (
        <Group justify="center" mt="lg">
          <Pagination
            total={Math.ceil(total / limit)}
            value={page}
            onChange={handlePageChange}
            size="sm"
          />
        </Group>
      )}
    </Card>
  );
}
