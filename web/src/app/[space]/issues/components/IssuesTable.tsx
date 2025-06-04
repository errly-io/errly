'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Table,
  Card,
  Group,
  Text,
  Badge,
  ActionIcon,
  Menu,
  Checkbox,
  Button,
  Pagination,
  Title,
  Stack
} from '@mantine/core';
import {
  IconDots,
  IconCheck,
  IconEyeOff,
  IconAlertTriangle,
  IconCalendar,
  IconUsers,
  IconActivity
} from '@tabler/icons-react';
import { formatDate, formatNumber } from '@/utils/dateFormat';
import { resolveIssue, ignoreIssue, unresolveIssue, bulkUpdateIssues } from '@/lib/actions/issues';
import { Issue, PaginatedResponse } from '@/lib/types/database';

interface IssuesTableProps {
  issuesResponse: PaginatedResponse<Issue>;
  space: string;
}

export function IssuesTable({ issuesResponse, space }: IssuesTableProps) {
  const router = useRouter();
  const [selectedIssues, setSelectedIssues] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();

  const { data: issues, total, page, limit } = issuesResponse;

  const handleSelectAll = (checked: boolean) => {
    setSelectedIssues(checked ? issues.map(issue => issue.id) : []);
  };

  const handleSelectIssue = (issueId: string, checked: boolean) => {
    setSelectedIssues(prev =>
      checked
        ? [...prev, issueId]
        : prev.filter(id => id !== issueId)
    );
  };

  const handleStatusChange = (issueId: string, status: 'resolved' | 'ignored' | 'unresolved') => {
    startTransition(async () => {
      try {
        let result;
        switch (status) {
          case 'resolved':
            result = await resolveIssue(issueId);
            break;
          case 'ignored':
            result = await ignoreIssue(issueId);
            break;
          case 'unresolved':
            result = await unresolveIssue(issueId);
            break;
        }

        if (!result.success) {
          console.error('Failed to update issue status:', result.error);
        }
      } catch (error) {
        console.error('Error updating issue status:', error);
      }
    });
  };

  const handleBulkAction = (status: 'resolved' | 'ignored' | 'unresolved') => {
    if (selectedIssues.length === 0) return;

    startTransition(async () => {
      try {
        const result = await bulkUpdateIssues(selectedIssues, status);

        if (result.success) {
          // Clear selected issues after successful update
          setSelectedIssues([]);
        } else {
          console.error('Failed to update issues:', result.error);
        }
      } catch (error) {
        console.error('Error updating issues:', error);
      }
    });
  };

  const handleIssueClick = (issueId: string) => {
    router.push(`/${space}/issues/${issueId}`);
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(window.location.search);
    params.set('page', newPage.toString());
    router.push(`?${params.toString()}`, { scroll: false });
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

  if (issues.length === 0) {
    return (
      <Card withBorder radius="md" p="xl" style={{ textAlign: 'center' }}>
        <IconAlertTriangle size={48} color="var(--mantine-color-gray-5)" style={{ margin: '0 auto 1rem' }} />
        <Title order={4} mb="xs">No issues found</Title>
        <Text c="dimmed">
          No issues match your current filters. Try adjusting your search criteria.
        </Text>
      </Card>
    );
  }

  return (
    <Stack gap="md">
      <Card withBorder radius="md" p={0}>
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th style={{ width: 40 }}>
                <Checkbox
                  checked={selectedIssues.length === issues.length && issues.length > 0}
                  indeterminate={selectedIssues.length > 0 && selectedIssues.length < issues.length}
                  onChange={(e) => handleSelectAll(e.currentTarget.checked)}
                />
              </Table.Th>
              <Table.Th>Issue</Table.Th>
              <Table.Th style={{ width: 100 }}>Level</Table.Th>
              <Table.Th style={{ width: 100 }}>Status</Table.Th>
              <Table.Th style={{ width: 120 }}>Events</Table.Th>
              <Table.Th style={{ width: 120 }}>Users</Table.Th>
              <Table.Th style={{ width: 150 }}>Last Seen</Table.Th>
              <Table.Th style={{ width: 60 }}>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {issues.map((issue) => (
              <Table.Tr
                key={issue.id}
                style={{ cursor: 'pointer' }}
                onClick={() => handleIssueClick(issue.id)}
              >
                <Table.Td onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedIssues.includes(issue.id)}
                    onChange={(e) => handleSelectIssue(issue.id, e.currentTarget.checked)}
                  />
                </Table.Td>

                <Table.Td>
                  <div>
                    <Text size="sm" fw={500} lineClamp={1}>
                      {issue.message}
                    </Text>
                    <Group gap="xs" mt={4}>
                      <Text size="xs" c="dimmed">
                        {issue.fingerprint.substring(0, 8)}
                      </Text>
                      {issue.environments.length > 0 && (
                        <Badge size="xs" variant="dot">
                          {issue.environments[0]}
                        </Badge>
                      )}
                    </Group>
                  </div>
                </Table.Td>

                <Table.Td>
                  <Badge
                    size="sm"
                    variant="light"
                    color={getLevelColor(issue.level)}
                  >
                    {issue.level}
                  </Badge>
                </Table.Td>

                <Table.Td>
                  <Badge
                    size="sm"
                    variant="light"
                    color={getStatusColor(issue.status)}
                  >
                    {issue.status}
                  </Badge>
                </Table.Td>

                <Table.Td>
                  <Group gap="xs">
                    <IconActivity size={14} />
                    <Text size="sm" fw={500}>
                      {formatNumber(issue.event_count)}
                    </Text>
                  </Group>
                </Table.Td>

                <Table.Td>
                  <Group gap="xs">
                    <IconUsers size={14} />
                    <Text size="sm">
                      {formatNumber(issue.user_count)}
                    </Text>
                  </Group>
                </Table.Td>

                <Table.Td>
                  <Group gap="xs">
                    <IconCalendar size={14} />
                    <Text size="xs" c="dimmed">
                      {formatDate(issue.last_seen)}
                    </Text>
                  </Group>
                </Table.Td>

                <Table.Td onClick={(e) => e.stopPropagation()}>
                  <Menu shadow="md" width={160}>
                    <Menu.Target>
                      <ActionIcon
                        variant="subtle"
                        color="gray"
                        loading={isPending}
                      >
                        <IconDots size={16} />
                      </ActionIcon>
                    </Menu.Target>
                    <Menu.Dropdown>
                      {issue.status !== 'resolved' && (
                        <Menu.Item
                          leftSection={<IconCheck size={16} />}
                          onClick={() => handleStatusChange(issue.id, 'resolved')}
                        >
                          Resolve
                        </Menu.Item>
                      )}
                      {issue.status !== 'ignored' && (
                        <Menu.Item
                          leftSection={<IconEyeOff size={16} />}
                          onClick={() => handleStatusChange(issue.id, 'ignored')}
                        >
                          Ignore
                        </Menu.Item>
                      )}
                      {issue.status !== 'unresolved' && (
                        <Menu.Item
                          leftSection={<IconAlertTriangle size={16} />}
                          onClick={() => handleStatusChange(issue.id, 'unresolved')}
                        >
                          Unresolve
                        </Menu.Item>
                      )}
                    </Menu.Dropdown>
                  </Menu>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Card>

      {/* Pagination */}
      {total > limit && (
        <Group justify="center">
          <Pagination
            total={Math.ceil(total / limit)}
            value={page}
            onChange={handlePageChange}
            size="sm"
          />
        </Group>
      )}

      {/* Bulk actions */}
      {selectedIssues.length > 0 && (
        <Card withBorder radius="md" p="md" bg="blue.0">
          <Group justify="space-between">
            <Text size="sm">
              {selectedIssues.length} issue{selectedIssues.length > 1 ? 's' : ''} selected
            </Text>
            <Group gap="xs">
              <Button
                size="xs"
                variant="light"
                loading={isPending}
                onClick={() => handleBulkAction('resolved')}
              >
                Bulk Resolve
              </Button>
              <Button
                size="xs"
                variant="light"
                color="gray"
                loading={isPending}
                onClick={() => handleBulkAction('ignored')}
              >
                Bulk Ignore
              </Button>
            </Group>
          </Group>
        </Card>
      )}
    </Stack>
  );
}
