'use client';

import { useEffect } from 'react';
import { Container, Title, Text, Button, Stack, ThemeIcon, Alert } from '@mantine/core';
import { IconRefresh, IconBug, IconAlertTriangle } from '@tabler/icons-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Application error:', error);
  }, [error]);

  return (
    <Container size="sm" py="xl">
      <Stack align="center" gap="xl" style={{ textAlign: 'center', minHeight: '60vh', justifyContent: 'center' }}>
        <ThemeIcon size={80} radius="xl" variant="light" color="red">
          <IconBug size={40} />
        </ThemeIcon>
        
        <div>
          <Title order={1} mb="md">Something went wrong!</Title>
          <Text c="dimmed" size="lg" maw={500} mx="auto" mb="lg">
            An unexpected error occurred. Our team has been notified and is working on a fix.
          </Text>
          
          {process.env.NODE_ENV === 'development' && (
            <Alert
              icon={<IconAlertTriangle size={16} />}
              title="Development Error Details"
              color="orange"
              variant="light"
              style={{ textAlign: 'left', maxWidth: 600, margin: '0 auto' }}
            >
              <Text size="sm" style={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                {error.message}
              </Text>
              {error.digest && (
                <Text size="xs" c="dimmed" mt="xs">
                  Error ID: {error.digest}
                </Text>
              )}
            </Alert>
          )}
        </div>
        
        <Button
          leftSection={<IconRefresh size={16} />}
          size="lg"
          onClick={reset}
        >
          Try Again
        </Button>
      </Stack>
    </Container>
  );
}
