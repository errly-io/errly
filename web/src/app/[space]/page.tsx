'use client';

import { useParams } from 'next/navigation';
import { Container, Title, Text, Card, Grid, Group, Button, Badge } from '@mantine/core';
import {
  IconBug,
  IconApps,
  IconRocket,
  IconChartBar,
  IconBell,
  IconUser,
  IconSettings,
  IconArrowRight
} from '@tabler/icons-react';
import Link from 'next/link';

export default function SpacePage() {
  const params = useParams();
  const space = params?.space as string || 'default';

  const features = [
    {
      title: 'Issues',
      description: 'Track and manage encountered problems',
      icon: IconBug,
      href: `/${space}/issues`,
      color: 'red'
    },
    {
      title: 'Projects',
      description: 'Manage your projects and workflows',
      icon: IconApps,
      href: `/${space}/projects`,
      color: 'blue'
    },
    {
      title: 'Profile',
      description: 'Manage your user profile and settings',
      icon: IconUser,
      href: `/${space}/profile`,
      color: 'green'
    },
    {
      title: 'Performance',
      description: 'Monitor application performance',
      icon: IconChartBar,
      href: `/${space}/performance`,
      color: 'orange'
    },
    {
      title: 'Releases',
      description: 'Track software releases and deployments',
      icon: IconRocket,
      href: `/${space}/releases`,
      color: 'purple'
    },
    {
      title: 'Alerts',
      description: 'Configure and manage notifications',
      icon: IconBell,
      href: `/${space}/alerts`,
      color: 'yellow'
    }
  ];

  return (
    <Container size="lg" py="xl">
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <Badge size="lg" variant="light" color="blue" mb="md">
          Space: {space}
        </Badge>
        <Title order={1} mb="md">
          Welcome to Errly
        </Title>
        <Text size="lg" c="dimmed" mb="xl">
          Your comprehensive error tracking and project management platform
        </Text>
      </div>

      <Grid>
        {features.map((feature) => (
          <Grid.Col key={feature.title} span={{ base: 12, sm: 6, md: 4 }}>
            <Card
              withBorder
              radius="md"
              p="lg"
              h="100%"
              style={{
                cursor: 'pointer',
                transition: 'transform 0.2s ease',
              }}
              component={Link}
              href={feature.href}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <Group justify="space-between" mb="md">
                <feature.icon size={32} color={`var(--mantine-color-${feature.color}-6)`} />
                <IconArrowRight size={16} color="var(--mantine-color-dimmed)" />
              </Group>

              <Title order={4} mb="xs">
                {feature.title}
              </Title>

              <Text size="sm" c="dimmed" mb="md">
                {feature.description}
              </Text>

              <Button
                variant="light"
                color={feature.color}
                size="xs"
                fullWidth
                component="span"
              >
                Open {feature.title}
              </Button>
            </Card>
          </Grid.Col>
        ))}
      </Grid>

      <Card withBorder radius="md" p="lg" mt="xl">
        <Group justify="space-between" mb="md">
          <Group gap="sm">
            <IconSettings size={20} />
            <Title order={4}>Quick Actions</Title>
          </Group>
        </Group>

        <Text size="sm" c="dimmed" mb="md">
          Get started with these common tasks:
        </Text>

        <Group gap="sm">
          <Button
            variant="light"
            size="sm"
            component={Link}
            href={`/${space}/issues`}
            leftSection={<IconBug size={16} />}
          >
            View Issues
          </Button>

          <Button
            variant="light"
            size="sm"
            component={Link}
            href={`/${space}/test-auth`}
            leftSection={<IconBug size={16} />}
          >
            Test Authentication
          </Button>

          <Button
            variant="light"
            size="sm"
            component={Link}
            href={`/${space}/debug`}
            leftSection={<IconSettings size={16} />}
          >
            Debug Info
          </Button>
        </Group>
      </Card>
    </Container>
  );
}
