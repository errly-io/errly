'use client';

import {
  AppShell,
  Group,
  Button,
  Text,
  Container,
  Stack,
  Divider,
  Anchor,
  Burger,
  Drawer,
  Box
} from '@mantine/core';
import { IconBug } from '@tabler/icons-react';
import { useDisclosure } from '@mantine/hooks';
import Link from 'next/link';
import React from 'react';

interface LandingLayoutProps {
  children: React.ReactNode;
}

export function LandingLayout({ children }: LandingLayoutProps) {
  const [opened, { open, close }] = useDisclosure(false);

  return (
    <AppShell
      header={{ height: 70 }}
      padding={0}
    >
      {/* Mobile Menu Drawer */}
      <Drawer opened={opened} onClose={close} title="Menu" hiddenFrom="sm">
        <Stack gap="lg">
          <Anchor
            component={Link}
            href="#features"
            onClick={close}
            c="dimmed"
            td="none"
          >
            Features
          </Anchor>
          <Anchor
            component={Link}
            href="#pricing"
            onClick={close}
            c="dimmed"
            td="none"
          >
            Pricing
          </Anchor>
          <Anchor
            component={Link}
            href="/default"
            onClick={close}
            c="dimmed"
            td="none"
          >
            Demo
          </Anchor>
          <Divider />
          <Button
            variant="subtle"
            component={Link}
            href="/auth/signin"
            onClick={close}
            fullWidth
          >
            Sign In
          </Button>
          <Button
            component={Link}
            href="/auth/signin"
            onClick={close}
            fullWidth
          >
            Get Started
          </Button>
        </Stack>
      </Drawer>

      {/* Header */}
      <AppShell.Header>
        <Container size="lg" h="100%">
          <Group h="100%" justify="space-between" align="center">
            {/* Logo */}
            <Group gap="sm">
              <IconBug size={28} color="var(--mantine-color-blue-6)" />
              <Text fw={700} size="xl" c="blue">
                Errly
              </Text>
            </Group>

            {/* Navigation */}
            <Group gap="lg" visibleFrom="sm">
              <Anchor
                component={Link}
                href="#features"
                c="dimmed"
                td="none"
                style={{ '&:hover': { color: 'var(--mantine-color-blue-6)' } }}
              >
                Features
              </Anchor>
              <Anchor
                component={Link}
                href="#pricing"
                c="dimmed"
                td="none"
                style={{ '&:hover': { color: 'var(--mantine-color-blue-6)' } }}
              >
                Pricing
              </Anchor>
              <Anchor
                component={Link}
                href="/default"
                c="dimmed"
                td="none"
                style={{ '&:hover': { color: 'var(--mantine-color-blue-6)' } }}
              >
                Demo
              </Anchor>
            </Group>

            {/* Auth Buttons */}
            <Group gap="sm">
              <Group gap="sm" visibleFrom="sm">
                <Button
                  variant="subtle"
                  component={Link}
                  href="/auth/signin"
                >
                  Sign In
                </Button>
                <Button
                  component={Link}
                  href="/auth/signin"
                >
                  Get Started
                </Button>
              </Group>

              <Burger
                opened={opened}
                onClick={open}
                hiddenFrom="sm"
                size="sm"
              />
            </Group>
          </Group>
        </Container>
      </AppShell.Header>

      {/* Main Content */}
      <AppShell.Main>
        {children}

        {/* Footer */}
        <Box component="footer" style={{ backgroundColor: 'white', borderTop: '1px solid var(--mantine-color-gray-3)' }}>
        <Container size="lg" py="xl">
          <Stack gap="xl">
            <Group justify="space-between" align="flex-start">
              {/* Logo and Description */}
              <Stack gap="md" maw={300}>
                <Group gap="sm">
                  <IconBug size={24} color="var(--mantine-color-blue-6)" />
                  <Text fw={700} size="lg" c="blue">
                    Errly
                  </Text>
                </Group>
                <Text size="sm" c="dimmed">
                  The modern error tracking and monitoring platform for development teams.
                </Text>
              </Stack>

              {/* Links */}
              <Group gap={60} align="flex-start" visibleFrom="sm">
                <Stack gap="sm">
                  <Text fw={500} size="sm">Product</Text>
                  <Stack gap="xs">
                    <Anchor component={Link} href="#features" size="sm" c="dimmed" td="none">
                      Features
                    </Anchor>
                    <Anchor component={Link} href="/default" size="sm" c="dimmed" td="none">
                      Demo
                    </Anchor>
                    <Anchor component={Link} href="#pricing" size="sm" c="dimmed" td="none">
                      Pricing
                    </Anchor>
                  </Stack>
                </Stack>

                <Stack gap="sm">
                  <Text fw={500} size="sm">Company</Text>
                  <Stack gap="xs">
                    <Anchor href="#" size="sm" c="dimmed" td="none">
                      About
                    </Anchor>
                    <Anchor href="#" size="sm" c="dimmed" td="none">
                      Blog
                    </Anchor>
                    <Anchor href="#" size="sm" c="dimmed" td="none">
                      Contact
                    </Anchor>
                  </Stack>
                </Stack>

                <Stack gap="sm">
                  <Text fw={500} size="sm">Support</Text>
                  <Stack gap="xs">
                    <Anchor href="#" size="sm" c="dimmed" td="none">
                      Documentation
                    </Anchor>
                    <Anchor href="#" size="sm" c="dimmed" td="none">
                      Help Center
                    </Anchor>
                    <Anchor href="#" size="sm" c="dimmed" td="none">
                      Status
                    </Anchor>
                  </Stack>
                </Stack>
              </Group>
            </Group>

            <Divider />

            <Group justify="space-between" align="center">
              <Text size="sm" c="dimmed">
                © 2024 Errly. All rights reserved.
              </Text>
              <Group gap="lg">
                <Anchor href="#" size="sm" c="dimmed" td="none">
                  Privacy Policy
                </Anchor>
                <Anchor href="#" size="sm" c="dimmed" td="none">
                  Terms of Service
                </Anchor>
              </Group>
            </Group>
          </Stack>
        </Container>
        </Box>
      </AppShell.Main>
    </AppShell>
  );
}
