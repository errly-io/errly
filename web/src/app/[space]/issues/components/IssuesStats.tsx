import { Card, Group, Text, Badge, SimpleGrid } from '@mantine/core';
import { IconBug, IconAlertTriangle, IconCheck, IconEyeOff } from '@tabler/icons-react';
import { formatNumber } from '@/utils/dateFormat';

interface IssuesStatsProps {
  stats: {
    total_issues: number;
    unresolved_issues: number;
    resolved_issues: number;
    ignored_issues: number;
  };
}

export function IssuesStats({ stats }: IssuesStatsProps) {
  const statItems = [
    {
      label: 'Total Issues',
      value: stats.total_issues,
      icon: IconBug,
      color: 'blue',
    },
    {
      label: 'Unresolved',
      value: stats.unresolved_issues,
      icon: IconAlertTriangle,
      color: 'red',
    },
    {
      label: 'Resolved',
      value: stats.resolved_issues,
      icon: IconCheck,
      color: 'green',
    },
    {
      label: 'Ignored',
      value: stats.ignored_issues,
      icon: IconEyeOff,
      color: 'gray',
    },
  ];

  return (
    <SimpleGrid cols={{ base: 2, sm: 4 }} mb="lg">
      {statItems.map((item) => (
        <Card key={item.label} withBorder radius="md" p="md">
          <Group justify="space-between" mb="xs">
            <Text size="sm" c="dimmed" fw={500}>
              {item.label}
            </Text>
            <item.icon size={20} color={`var(--mantine-color-${item.color}-6)`} />
          </Group>
          
          <Group align="baseline" gap="xs">
            <Text size="xl" fw={700}>
              {formatNumber(item.value)}
            </Text>
            {item.label === 'Unresolved' && item.value > 0 && (
              <Badge size="xs" color={item.color} variant="light">
                Needs attention
              </Badge>
            )}
          </Group>
        </Card>
      ))}
    </SimpleGrid>
  );
}
