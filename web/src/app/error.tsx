'use client';

import { useEffect } from 'react';
import { Container, Title, Text, Button, Stack, ThemeIcon, Alert } from '@mantine/core';
import { IconRefresh, IconBug, IconAlertTriangle } from '@tabler/icons-react';
import { createSafeError, escapeHtml } from '@/lib/security/error-handling';
import { logger } from '@/lib/logging/logger';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Create a secure error for logging
    const secureError = createSafeError(error, 'APPLICATION_ERROR');

    // Log securely without exposing sensitive information
    logger.error('Application error occurred', {
      errorCode: secureError.code,
      timestamp: secureError.timestamp,
      digest: error.digest,
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'unknown',
      url: typeof window !== 'undefined' ? window.location.href : 'unknown',
    }, error);
  }, [error]);

  // Create secure error for display
  const secureError = createSafeError(error, 'APPLICATION_ERROR');
  const safeMessage = escapeHtml(secureError.message);

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
                {safeMessage}
              </Text>
              {error.digest && (
                <Text size="xs" c="dimmed" mt="xs">
                  Error ID: {error.digest}
                </Text>
              )}
              <Text size="xs" c="dimmed" mt="xs">
                Error Code: {secureError.code}
              </Text>
              <Text size="xs" c="dimmed" mt="xs">
                Timestamp: {new Date(secureError.timestamp).toISOString()}
              </Text>
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
