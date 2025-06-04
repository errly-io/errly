'use client';

import { 
  Container, 
  SimpleGrid, 
  Card, 
  Text, 
  Group, 
  Avatar, 
  Stack, 
  Title, 
  Badge,
  Rating
} from '@mantine/core';
import { IconQuote } from '@tabler/icons-react';

export function TestimonialsSection() {
  const testimonials = [
    {
      name: 'Sarah Chen',
      role: 'Senior Developer',
      company: 'TechCorp',
      avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
      rating: 5,
      text: 'Errly has completely transformed how we handle errors in production. The real-time alerts and detailed stack traces save us hours of debugging time.'
    },
    {
      name: 'Michael Rodriguez',
      role: 'DevOps Engineer',
      company: 'StartupXYZ',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
      rating: 5,
      text: 'The integration was seamless and the performance monitoring features help us maintain 99.9% uptime. Highly recommended for any development team.'
    },
    {
      name: 'Emily Johnson',
      role: 'CTO',
      company: 'InnovateLabs',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
      rating: 5,
      text: 'Errly gives us the confidence to ship faster. The error tracking and team collaboration features are exactly what we needed to scale our development process.'
    }
  ];

  return (
    <Container size="lg" py={80}>
      <Stack align="center" gap="xl" mb={60}>
        <Badge size="lg" variant="light" color="purple">
          Testimonials
        </Badge>
        <Title order={2} ta="center" size="2.5rem">
          Loved by developers worldwide
        </Title>
        <Text size="lg" ta="center" c="dimmed" maw={600}>
          See what development teams are saying about Errly.
        </Text>
      </Stack>

      <SimpleGrid cols={{ base: 1, md: 3 }} spacing="xl">
        {testimonials.map((testimonial) => (
          <Card key={testimonial.name} withBorder radius="lg" p="xl" h="100%">
            <Stack gap="lg">
              <Group gap="sm">
                <IconQuote size={24} color="var(--mantine-color-blue-6)" />
                <Rating value={testimonial.rating} readOnly size="sm" />
              </Group>
              
              <Text size="sm" lh={1.6} style={{ fontStyle: 'italic' }}>
                "{testimonial.text}"
              </Text>
              
              <Group gap="sm">
                <Avatar 
                  src={testimonial.avatar} 
                  size={40} 
                  radius="xl" 
                />
                <div>
                  <Text fw={500} size="sm">
                    {testimonial.name}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {testimonial.role} at {testimonial.company}
                  </Text>
                </div>
              </Group>
            </Stack>
          </Card>
        ))}
      </SimpleGrid>
    </Container>
  );
}
