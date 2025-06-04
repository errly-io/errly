'use client';

import { Container, SimpleGrid, Stack, Text, Title, ThemeIcon } from '@mantine/core';
import { IconUsers, IconBug, IconRocket, IconShield } from '@tabler/icons-react';

export function StatsSection() {
  const stats = [
    {
      icon: IconUsers,
      value: '10,000+',
      label: 'Developers Trust Us',
      color: 'blue'
    },
    {
      icon: IconBug,
      value: '1M+',
      label: 'Errors Tracked Daily',
      color: 'red'
    },
    {
      icon: IconRocket,
      value: '99.9%',
      label: 'Uptime Guarantee',
      color: 'green'
    },
    {
      icon: IconShield,
      value: '24/7',
      label: 'Security Monitoring',
      color: 'orange'
    }
  ];

  return (
    <Container size="lg" py={80}>
      <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="xl">
        {stats.map((stat) => (
          <Stack key={stat.label} align="center" gap="md">
            <ThemeIcon
              size={60}
              radius="xl"
              variant="light"
              color={stat.color}
            >
              <stat.icon size={30} />
            </ThemeIcon>

            <div style={{ textAlign: 'center' }}>
              <Title order={2} size="2rem" mb="xs">
                {stat.value}
              </Title>
              <Text c="dimmed" fw={500}>
                {stat.label}
              </Text>
            </div>
          </Stack>
        ))}
      </SimpleGrid>
    </Container>
  );
}
