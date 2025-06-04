'use client';

import { 
  Container, 
  Stack, 
  Title, 
  Text, 
  Button, 
  Group, 
  Box,
  ThemeIcon
} from '@mantine/core';
import { IconRocket, IconArrowRight } from '@tabler/icons-react';
import Link from 'next/link';

export function CTASection() {
  return (
    <Box style={{ 
      background: 'linear-gradient(135deg, var(--mantine-color-blue-6), var(--mantine-color-blue-8))',
      color: 'white'
    }}>
      <Container size="lg" py={80}>
        <Stack align="center" gap="xl" maw={800} mx="auto">
          <ThemeIcon
            size={80}
            radius="xl"
            variant="white"
            color="blue"
          >
            <IconRocket size={40} />
          </ThemeIcon>
          
          <Title 
            order={2} 
            ta="center" 
            size="2.5rem" 
            c="white"
          >
            Ready to start tracking errors?
          </Title>
          
          <Text 
            size="xl" 
            ta="center" 
            opacity={0.9}
            maw={600}
          >
            Join thousands of developers who trust Errly to monitor their applications. 
            Get started in minutes with our free plan.
          </Text>
          
          <Group gap="md" mt="xl">
            <Button 
              size="lg" 
              variant="white"
              color="blue"
              component={Link} 
              href="/auth/signin"
              rightSection={<IconArrowRight size={18} />}
            >
              Start Free Trial
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              c="white"
              style={{ borderColor: 'white' }}
              component={Link} 
              href="/default"
            >
              View Demo
            </Button>
          </Group>
          
          <Text size="sm" ta="center" opacity={0.8}>
            No credit card required • 14-day free trial • Cancel anytime
          </Text>
        </Stack>
      </Container>
    </Box>
  );
}
