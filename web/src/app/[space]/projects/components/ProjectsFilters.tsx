'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Card, Group, TextInput, Select, Text } from '@mantine/core';
import { IconSearch, IconFilter } from '@tabler/icons-react';

interface ProjectsFiltersProps {
  currentSearch: string;
  currentStatus: string;
  totalProjects: number;
  filteredCount: number;
}

export function ProjectsFilters({ 
  currentSearch, 
  currentStatus, 
  totalProjects, 
  filteredCount 
}: ProjectsFiltersProps) {
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

  return (
    <Card withBorder radius="md" p="md" mb="lg">
      <Group justify="space-between">
        <Group gap="md">
          <TextInput
            placeholder="Search projects..."
            leftSection={<IconSearch size={16} />}
            value={currentSearch}
            onChange={(e) => handleSearchChange(e.target.value)}
            style={{ minWidth: 250 }}
          />
          <Select
            placeholder="Filter by status"
            leftSection={<IconFilter size={16} />}
            value={currentStatus}
            onChange={handleStatusChange}
            data={[
              { value: 'all', label: 'All Projects' },
              { value: 'active', label: 'With Issues' },
              { value: 'healthy', label: 'Healthy' },
            ]}
            style={{ minWidth: 150 }}
          />
        </Group>
        
        <Text size="sm" c="dimmed">
          {filteredCount} of {totalProjects} projects
        </Text>
      </Group>
    </Card>
  );
}
