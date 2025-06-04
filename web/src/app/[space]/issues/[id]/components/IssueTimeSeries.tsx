import { Card, Title, Text, Group, Badge } from '@mantine/core';
import { IconTrendingUp, IconTrendingDown, IconMinus } from '@tabler/icons-react';
import { formatNumber } from '@/utils/dateFormat';

interface IssueTimeSeriesProps {
  timeSeries: Array<{ timestamp: Date; count: number }>;
  issueId: string;
}

export function IssueTimeSeries({ timeSeries, issueId: _issueId }: IssueTimeSeriesProps) {
  // Simple time series visualization
  const maxCount = Math.max(...timeSeries.map(point => point.count), 1);
  const totalEvents = timeSeries.reduce((sum, point) => sum + point.count, 0);

  const getTrend = () => {
    if (timeSeries.length < 2) return 'stable';

    const firstHalf = timeSeries.slice(0, Math.floor(timeSeries.length / 2));
    const secondHalf = timeSeries.slice(Math.floor(timeSeries.length / 2));

    const firstHalfAvg = firstHalf.reduce((sum, p) => sum + p.count, 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, p) => sum + p.count, 0) / secondHalf.length;

    const change = ((secondHalfAvg - firstHalfAvg) / (firstHalfAvg || 1)) * 100;

    if (change > 10) return 'up';
    if (change < -10) return 'down';
    return 'stable';
  };

  const trend = getTrend();

  const getTrendIcon = () => {
    switch (trend) {
      case 'up': return <IconTrendingUp size={16} color="red" />;
      case 'down': return <IconTrendingDown size={16} color="green" />;
      default: return <IconMinus size={16} color="gray" />;
    }
  };

  const getTrendColor = () => {
    switch (trend) {
      case 'up': return 'red';
      case 'down': return 'green';
      default: return 'gray';
    }
  };

  const getTrendLabel = () => {
    switch (trend) {
      case 'up': return 'Increasing';
      case 'down': return 'Decreasing';
      default: return 'Stable';
    }
  };

  return (
    <Card withBorder radius="md" p="lg" mb="lg">
      <Group justify="space-between" mb="md">
        <Title order={4}>Event Timeline (24h)</Title>
        <Group gap="xs">
          {getTrendIcon()}
          <Badge variant="light" color={getTrendColor()}>
            {getTrendLabel()}
          </Badge>
        </Group>
      </Group>

      <Text size="sm" c="dimmed" mb="lg">
        {formatNumber(totalEvents)} events in the last 24 hours
      </Text>

      <div style={{ display: 'flex', alignItems: 'end', gap: '2px', height: '120px', marginBottom: '1rem' }}>
        {timeSeries.map((point) => {
          const height = maxCount > 0 ? (point.count / maxCount) * 100 : 0;
          return (
            <div
              key={point.timestamp.toISOString()}
              style={{
                flex: 1,
                height: `${Math.max(height, 2)}%`,
                backgroundColor: point.count > 0 ? 'var(--mantine-color-blue-6)' : 'var(--mantine-color-gray-3)',
                borderRadius: '2px 2px 0 0',
                minHeight: '2px',
                position: 'relative',
              }}
              title={`${point.timestamp.toLocaleTimeString()}: ${point.count} events`}
            />
          );
        })}
      </div>

      {/* Time labels */}
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <Text size="xs" c="dimmed">
          {timeSeries[0]?.timestamp.toLocaleTimeString() || ''}
        </Text>
        <Text size="xs" c="dimmed">
          Now
        </Text>
      </div>

      {timeSeries.length === 0 && (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <Text c="dimmed">No events in the last 24 hours</Text>
        </div>
      )}
    </Card>
  );
}
