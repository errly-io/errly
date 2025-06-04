'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Card, Group, TextInput, Select, Text, Badge } from '@mantine/core';
import { IconSearch, IconFilter, IconApps, IconAlertTriangle } from '@tabler/icons-react';
import { ProjectWithSettings, IssuesSearchParams } from '@/lib/types/database';

interface IssuesFiltersProps {
  projects: ProjectWithSettings[];
  currentFilters: IssuesSearchParams;
  totalIssues: number;
}

export function IssuesFilters({ projects, currentFilters, totalIssues }: IssuesFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateFilters = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());

    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '' || value === 'all') {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });

    // Reset page when filters change
    params.delete('page');

    const queryString = params.toString();
    const url = queryString ? `?${queryString}` : '';

    router.push(url, { scroll: false });
  };

  const handleSearchChange = (value: string) => {
    updateFilters({ search: value });
  };

  const handleStatusChange = (value: string | null) => {
    updateFilters({ status: value });
  };

  const handleProjectChange = (value: string | null) => {
    updateFilters({ project: value });
  };

  const handleEnvironmentChange = (value: string | null) => {
    updateFilters({ environment: value });
  };

  const handleLevelChange = (value: string | null) => {
    updateFilters({ level: value });
  };

  // Get unique environments from all projects
  const allEnvironments = Array.from(
    new Set(
      projects.flatMap(project =>
        project.settings?.environments || []
      )
    )
  );

  return (
    <Card withBorder radius="md" p="md" mb="lg">
      <Group justify="space-between" mb="md">
        <Group gap="md" wrap="wrap">
          <TextInput
            placeholder="Search issues..."
            leftSection={<IconSearch size={16} />}
            value={currentFilters.search || ''}
            onChange={(e) => handleSearchChange(e.target.value)}
            style={{ minWidth: 250 }}
          />

          <Select
            placeholder="Status"
            leftSection={<IconAlertTriangle size={16} />}
            value={currentFilters.status || 'all'}
            onChange={handleStatusChange}
            data={[
              { value: 'all', label: 'All Statuses' },
              { value: 'unresolved', label: 'Unresolved' },
              { value: 'resolved', label: 'Resolved' },
              { value: 'ignored', label: 'Ignored' },
            ]}
            style={{ minWidth: 140 }}
          />

          <Select
            placeholder="Project"
            leftSection={<IconApps size={16} />}
            value={currentFilters.project || 'all'}
            onChange={handleProjectChange}
            data={[
              { value: 'all', label: 'All Projects' },
              ...projects.map(project => ({
                value: project.id,
                label: project.name
              }))
            ]}
            style={{ minWidth: 160 }}
          />

          <Select
            placeholder="Environment"
            leftSection={<IconFilter size={16} />}
            value={currentFilters.environment || 'all'}
            onChange={handleEnvironmentChange}
            data={[
              { value: 'all', label: 'All Environments' },
              ...allEnvironments.map(env => ({
                value: env,
                label: env.charAt(0).toUpperCase() + env.slice(1)
              }))
            ]}
            style={{ minWidth: 150 }}
          />

          <Select
            placeholder="Level"
            leftSection={<IconAlertTriangle size={16} />}
            value={currentFilters.level || 'all'}
            onChange={handleLevelChange}
            data={[
              { value: 'all', label: 'All Levels' },
              { value: 'error', label: 'Error' },
              { value: 'warning', label: 'Warning' },
              { value: 'info', label: 'Info' },
              { value: 'debug', label: 'Debug' },
            ]}
            style={{ minWidth: 120 }}
          />
        </Group>
      </Group>

      <Group justify="space-between" align="center">
        <Group gap="xs">
          {Object.entries(currentFilters).map(([key, value]) => {
            if (!value || value === 'all') return null;

            let label = value;
            if (key === 'project') {
              const project = projects.find(p => p.id === value);
              label = project?.name || value;
            }

            return (
              <Badge
                key={key}
                variant="light"
                size="sm"
                style={{ cursor: 'pointer' }}
                onClick={() => updateFilters({ [key]: null })}
              >
                {key}: {label} ×
              </Badge>
            );
          })}
        </Group>

        <Text size="sm" c="dimmed">
          {totalIssues} issues found
        </Text>
      </Group>
    </Card>
  );
}
