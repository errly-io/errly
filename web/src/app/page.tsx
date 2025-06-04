import {
  Container,
  Title,
  Text,
  Button,
  Group,
  Stack,
  Card,
  SimpleGrid,
  ThemeIcon,
  Badge,
  Center,
  Box
} from '@mantine/core';
import {
  IconBug,
  IconChartBar,
  IconBell,
  IconShield,
  IconRocket,
  IconUsers,
  IconArrowRight,
  IconCheck
} from '@tabler/icons-react';
import Link from 'next/link';
import { LandingLayout } from '@/components/landing/LandingLayout';
import { StatsSection } from '@/components/landing/StatsSection';
import { TestimonialsSection } from '@/components/landing/TestimonialsSection';
import { CTASection } from '@/components/landing/CTASection';

export default function LandingPage() {
  const features = [
    {
      icon: IconBug,
      title: 'Error Tracking',
      description: 'Capture and track errors in real-time across all your applications with detailed stack traces and context.',
      color: 'red'
    },
    {
      icon: IconChartBar,
      title: 'Performance Monitoring',
      description: 'Monitor application performance, identify bottlenecks, and optimize user experience.',
      color: 'blue'
    },
    {
      icon: IconBell,
      title: 'Smart Alerts',
      description: 'Get notified instantly when issues occur with intelligent alerting and escalation rules.',
      color: 'orange'
    },
    {
      icon: IconShield,
      title: 'Security First',
      description: 'Enterprise-grade security with data encryption, access controls, and compliance features.',
      color: 'green'
    },
    {
      icon: IconRocket,
      title: 'Fast Integration',
      description: 'Get started in minutes with SDKs for all major programming languages and frameworks.',
      color: 'purple'
    },
    {
      icon: IconUsers,
      title: 'Team Collaboration',
      description: 'Work together to resolve issues faster with assignment, comments, and workflow automation.',
      color: 'cyan'
    }
  ];

  const benefits = [
    'Real-time error tracking and monitoring',
    'Detailed stack traces and error context',
    'Performance metrics and insights',
    'Team collaboration tools',
    'Custom alerting and notifications',
    'Enterprise security and compliance'
  ];

  return (
    <LandingLayout>
      <Box>
      {/* Hero Section */}
      <Container size="lg" py={80}>
        <Center>
          <Stack align="center" gap="xl" maw={800}>
            <Badge size="lg" variant="light" color="blue">
              Error Tracking & Monitoring Platform
            </Badge>

            <Title
              order={1}
              size="3.5rem"
              ta="center"
              lh={1.1}
              style={{
                background: 'linear-gradient(45deg, #228be6, #339af0)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}
            >
              Track Errors.
              <br />
              Fix Issues.
              <br />
              Ship Faster.
            </Title>

            <Text size="xl" ta="center" c="dimmed" maw={600}>
              Errly helps development teams catch, track, and resolve errors in real-time.
              Monitor your applications, collaborate on fixes, and deliver better software.
            </Text>

            <Group gap="md" mt="xl">
              <Button
                size="lg"
                component={Link}
                href="/auth/signin"
                rightSection={<IconArrowRight size={18} />}
              >
                Get Started Free
              </Button>
              <Button
                size="lg"
                variant="outline"
                component={Link}
                href="/default"
              >
                View Demo
              </Button>
            </Group>
          </Stack>
        </Center>
      </Container>

      {/* Stats Section */}
      <StatsSection />

      {/* Features Section */}
      <Container size="lg" py={80} id="features">
        <Stack align="center" gap="xl" mb={60}>
          <Badge size="lg" variant="light" color="blue">
            Features
          </Badge>
          <Title order={2} ta="center" size="2.5rem">
            Everything you need to monitor your applications
          </Title>
          <Text size="lg" ta="center" c="dimmed" maw={600}>
            Comprehensive error tracking and monitoring tools designed for modern development teams.
          </Text>
        </Stack>

        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="xl">
          {features.map((feature) => (
            <Card key={feature.title} withBorder radius="md" p="xl" h="100%">
              <ThemeIcon
                size={60}
                radius="md"
                variant="light"
                color={feature.color}
                mb="md"
              >
                <feature.icon size={30} />
              </ThemeIcon>

              <Title order={4} mb="sm">
                {feature.title}
              </Title>

              <Text c="dimmed" size="sm" lh={1.6}>
                {feature.description}
              </Text>
            </Card>
          ))}
        </SimpleGrid>
      </Container>

      {/* Pricing Section */}
      <Container size="lg" py={80} id="pricing">
        <Stack align="center" gap="xl" mb={60}>
          <Badge size="lg" variant="light" color="green">
            Pricing
          </Badge>
          <Title order={2} ta="center" size="2.5rem">
            Simple, transparent pricing
          </Title>
          <Text size="lg" ta="center" c="dimmed" maw={600}>
            Start free and scale as you grow. No hidden fees, no surprises.
          </Text>
        </Stack>

        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="xl">
          {/* Free Plan */}
          <Card withBorder radius="lg" p="xl" h="100%">
            <Stack gap="lg">
              <div>
                <Text fw={500} size="lg">Free</Text>
                <Group gap="xs" align="baseline">
                  <Text size="3rem" fw={700}>$0</Text>
                  <Text c="dimmed">/month</Text>
                </Group>
                <Text size="sm" c="dimmed">Perfect for getting started</Text>
              </div>

              <Stack gap="sm">
                <Group gap="sm">
                  <IconCheck size={16} color="var(--mantine-color-green-6)" />
                  <Text size="sm">Up to 5,000 events/month</Text>
                </Group>
                <Group gap="sm">
                  <IconCheck size={16} color="var(--mantine-color-green-6)" />
                  <Text size="sm">1 project</Text>
                </Group>
                <Group gap="sm">
                  <IconCheck size={16} color="var(--mantine-color-green-6)" />
                  <Text size="sm">7-day data retention</Text>
                </Group>
                <Group gap="sm">
                  <IconCheck size={16} color="var(--mantine-color-green-6)" />
                  <Text size="sm">Email support</Text>
                </Group>
              </Stack>

              <Button variant="outline" fullWidth component={Link} href="/auth/signin">
                Get Started
              </Button>
            </Stack>
          </Card>

          {/* Pro Plan */}
          <Card withBorder radius="lg" p="xl" h="100%" style={{ borderColor: 'var(--mantine-color-blue-6)', position: 'relative' }}>
            <Badge
              color="blue"
              variant="filled"
              style={{ position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)' }}
            >
              Most Popular
            </Badge>
            <Stack gap="lg">
              <div>
                <Text fw={500} size="lg">Pro</Text>
                <Group gap="xs" align="baseline">
                  <Text size="3rem" fw={700}>$29</Text>
                  <Text c="dimmed">/month</Text>
                </Group>
                <Text size="sm" c="dimmed">For growing teams</Text>
              </div>

              <Stack gap="sm">
                <Group gap="sm">
                  <IconCheck size={16} color="var(--mantine-color-green-6)" />
                  <Text size="sm">Up to 100,000 events/month</Text>
                </Group>
                <Group gap="sm">
                  <IconCheck size={16} color="var(--mantine-color-green-6)" />
                  <Text size="sm">Unlimited projects</Text>
                </Group>
                <Group gap="sm">
                  <IconCheck size={16} color="var(--mantine-color-green-6)" />
                  <Text size="sm">90-day data retention</Text>
                </Group>
                <Group gap="sm">
                  <IconCheck size={16} color="var(--mantine-color-green-6)" />
                  <Text size="sm">Priority support</Text>
                </Group>
                <Group gap="sm">
                  <IconCheck size={16} color="var(--mantine-color-green-6)" />
                  <Text size="sm">Advanced integrations</Text>
                </Group>
              </Stack>

              <Button fullWidth component={Link} href="/auth/signin">
                Start Free Trial
              </Button>
            </Stack>
          </Card>

          {/* Enterprise Plan */}
          <Card withBorder radius="lg" p="xl" h="100%">
            <Stack gap="lg">
              <div>
                <Text fw={500} size="lg">Enterprise</Text>
                <Group gap="xs" align="baseline">
                  <Text size="3rem" fw={700}>Custom</Text>
                </Group>
                <Text size="sm" c="dimmed">For large teams</Text>
              </div>

              <Stack gap="sm">
                <Group gap="sm">
                  <IconCheck size={16} color="var(--mantine-color-green-6)" />
                  <Text size="sm">Unlimited events</Text>
                </Group>
                <Group gap="sm">
                  <IconCheck size={16} color="var(--mantine-color-green-6)" />
                  <Text size="sm">Unlimited projects</Text>
                </Group>
                <Group gap="sm">
                  <IconCheck size={16} color="var(--mantine-color-green-6)" />
                  <Text size="sm">Custom data retention</Text>
                </Group>
                <Group gap="sm">
                  <IconCheck size={16} color="var(--mantine-color-green-6)" />
                  <Text size="sm">24/7 dedicated support</Text>
                </Group>
                <Group gap="sm">
                  <IconCheck size={16} color="var(--mantine-color-green-6)" />
                  <Text size="sm">On-premise deployment</Text>
                </Group>
              </Stack>

              <Button variant="outline" fullWidth>
                Contact Sales
              </Button>
            </Stack>
          </Card>
        </SimpleGrid>
      </Container>

      {/* Benefits Section */}
      <Container size="lg" py={80}>
        <Stack align="center" gap="xl" maw={800} mx="auto">
          <Badge size="lg" variant="light" color="green">
            Why Choose Errly
          </Badge>

          <Title order={2} size="2.5rem" ta="center">
            Built for developers, by developers
          </Title>

          <Text size="lg" c="dimmed" lh={1.6} ta="center">
            We understand the challenges of modern software development.
            Errly provides the tools and insights you need to build reliable applications.
          </Text>

          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xl" w="100%" mt="xl">
            {benefits.map((benefit) => (
              <Group key={benefit} gap="sm" align="flex-start">
                <ThemeIcon size={20} radius="xl" color="green" variant="light">
                  <IconCheck size={12} />
                </ThemeIcon>
                <Text>{benefit}</Text>
              </Group>
            ))}
          </SimpleGrid>

          <Group gap="md" mt="xl">
            <Button
              size="lg"
              component={Link}
              href="/auth/signin"
              rightSection={<IconArrowRight size={18} />}
            >
              Start Free Trial
            </Button>
            <Button
              size="lg"
              variant="outline"
              component={Link}
              href="/default"
            >
              Explore Demo
            </Button>
          </Group>
        </Stack>
      </Container>

      {/* Testimonials Section */}
      <TestimonialsSection />

      {/* CTA Section */}
      <CTASection />
      </Box>
    </LandingLayout>
  );
}
