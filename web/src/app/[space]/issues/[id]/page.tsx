import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import {
  Container,
  Title,
  Text,
  Group,
  Badge,
  Card,
  Button,
  Skeleton,
  Breadcrumbs,
  Anchor
} from '@mantine/core';
import {
  IconArrowLeft,
  IconCalendar,
  IconUsers,
  IconActivity
} from '@tabler/icons-react';
import Link from 'next/link';
import { getIssue, getIssueEvents, getIssueTimeSeries } from '@/lib/data/issues';
import { formatDate, formatNumber } from '@/utils/dateFormat';
import { IssueEvents } from './components/IssueEvents';
import { IssueTimeSeries } from './components/IssueTimeSeries';
import { IssueActions } from './components/IssueActions';

interface Props {
  params: Promise<{ space: string; id: string }>;
  searchParams: Promise<{
    events_page?: string;
  }>;
}

export default async function IssuePage({ params, searchParams }: Props) {
  const { space, id } = await params;
  const resolvedSearchParams = await searchParams;

  // Get issue
  const issue = await getIssue(id);

  if (!issue) {
    notFound();
  }

  // Get events and time series in parallel
  const [eventsResponse, timeSeries] = await Promise.all([
    getIssueEvents({
      issue_id: id,
      page: parseInt(resolvedSearchParams.events_page || '1'),
      limit: 20
    }),
    getIssueTimeSeries(id, '24h')
  ]);

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

  const breadcrumbItems = [
    { title: space, href: `/${space}` },
    { title: 'Issues', href: `/${space}/issues` },
    { title: issue.message.substring(0, 50) + '...', href: '#' },
  ].map((item) => (
    <Anchor component={Link} href={item.href} key={item.href}>
      {item.title}
    </Anchor>
  ));

  return (
    <Container size="xl" py="xl">
      {/* Breadcrumbs */}
      <Breadcrumbs mb="md">{breadcrumbItems}</Breadcrumbs>

      {/* Header */}
      <Group justify="space-between" mb="xl">
        <Group>
          <Button
            variant="subtle"
            leftSection={<IconArrowLeft size={16} />}
            component={Link}
            href={`/${space}/issues`}
          >
            Back to Issues
          </Button>
        </Group>

        <Suspense fallback={<Skeleton height={36} width={200} />}>
          <IssueActions issue={issue} space={space} />
        </Suspense>
      </Group>

      {/* Issue Header */}
      <Card withBorder radius="md" p="lg" mb="lg">
        <Group justify="space-between" mb="md">
          <Group gap="sm">
            <Badge
              size="lg"
              variant="light"
              color={getLevelColor(issue.level)}
            >
              {issue.level.toUpperCase()}
            </Badge>
            <Badge
              size="lg"
              variant="light"
              color={getStatusColor(issue.status)}
            >
              {issue.status.toUpperCase()}
            </Badge>
          </Group>

          <Text size="sm" c="dimmed">
            ID: {issue.fingerprint.substring(0, 12)}
          </Text>
        </Group>

        <Title order={2} mb="md">
          {issue.message}
        </Title>

        <Group gap="xl">
          <Group gap="xs">
            <IconActivity size={16} />
            <Text size="sm" fw={500}>
              {formatNumber(issue.event_count)} events
            </Text>
          </Group>

          <Group gap="xs">
            <IconUsers size={16} />
            <Text size="sm" fw={500}>
              {formatNumber(issue.user_count)} users affected
            </Text>
          </Group>

          <Group gap="xs">
            <IconCalendar size={16} />
            <Text size="sm" c="dimmed">
              First seen: {formatDate(issue.first_seen)}
            </Text>
          </Group>

          <Group gap="xs">
            <IconCalendar size={16} />
            <Text size="sm" c="dimmed">
              Last seen: {formatDate(issue.last_seen)}
            </Text>
          </Group>
        </Group>

        {/* Environments */}
        {issue.environments.length > 0 && (
          <Group gap="xs" mt="md">
            <Text size="sm" c="dimmed">Environments:</Text>
            {issue.environments.map((env) => (
              <Badge key={env} size="sm" variant="outline">
                {env}
              </Badge>
            ))}
          </Group>
        )}

        {/* Tags */}
        {Object.keys(issue.tags).length > 0 && (
          <Group gap="xs" mt="sm">
            <Text size="sm" c="dimmed">Tags:</Text>
            {Object.entries(issue.tags).map(([key, value]) => (
              <Badge key={key} size="sm" variant="dot">
                {key}: {value}
              </Badge>
            ))}
          </Group>
        )}
      </Card>

      {/* Time Series Chart */}
      <Suspense fallback={<Skeleton height={300} mb="lg" />}>
        <IssueTimeSeries
          timeSeries={timeSeries}
          issueId={id}
        />
      </Suspense>

      {/* Events List */}
      <Suspense fallback={<Skeleton height={400} />}>
        <IssueEvents
          eventsResponse={eventsResponse}
          space={space}
          issueId={id}
        />
      </Suspense>
    </Container>
  );
}
