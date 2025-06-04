'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  Title,
  Text,
  Button,
  Group,
  Stack,
  PasswordInput,
  Modal,
  Table,
  Badge,
  ActionIcon,
  Alert,
  LoadingOverlay,
  Divider
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';

import {
  IconShield,
  IconKey,
  IconDevices,
  IconTrash,
  IconCheck,
  IconX,
  IconAlertCircle,
  IconLock
} from '@tabler/icons-react';
import { Effect, pipe } from 'effect';
import { ProfileService, ProfileModuleLayer } from '@/modules/profile/di';
import { ProfileResponse } from '@/modules/profile/application/dto/ProfileResponse';
import { UserSessionResponse } from '@/modules/profile/application/dto/ProfileResponse';
import { ChangePasswordRequest } from '@/modules/profile/application/dto/UpdateProfileRequest';
import { RuntimeClient } from '@/modules/shared/clientRuntime';

interface ProfileSecurityProps {
  profile: ProfileResponse;
}

export function ProfileSecurity({ profile }: ProfileSecurityProps) {
  const [loading, setLoading] = useState(false);
  const [sessions, setSessions] = useState<UserSessionResponse[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [passwordModalOpened, { open: openPasswordModal, close: closePasswordModal }] = useDisclosure(false);

  const passwordForm = useForm<ChangePasswordRequest>({
    initialValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    },
    validate: {
      currentPassword: (value) => value.length === 0 ? 'Current password is required' : null,
      newPassword: (value) => {
        if (value.length < 6) return 'Password must be at least 6 characters';
        if (value.length > 128) return 'Password must be less than 128 characters';
        return null;
      },
      confirmPassword: (value, values) =>
        value !== values.newPassword ? 'Passwords do not match' : null
    }
  });

  const loadSessions = async () => {
    setSessionsLoading(true);

    const sessionsEffect = pipe(
      Effect.flatMap(ProfileService, (service) => service.getUserSessions(profile.id)),
      Effect.tap((sessions) => {
        setSessions(sessions);
      }),
      Effect.catchAll((error) => {
        console.error('Failed to load sessions:', error);
        return Effect.void;
      }),
      Effect.tap(() => Effect.sync(() => setSessionsLoading(false))),
      Effect.provide(ProfileModuleLayer)
    );

    await RuntimeClient.runPromise(sessionsEffect);
  };

  useEffect(() => {
    loadSessions();
  }, [profile.id]);

  const handlePasswordChange = async (values: ChangePasswordRequest) => {
    setLoading(true);

    const changePasswordEffect = pipe(
      Effect.flatMap(ProfileService, (service) => service.changePassword(profile.id, values)),
      Effect.tap(() => {
        console.log('Password changed successfully');
        closePasswordModal();
        passwordForm.reset();
      }),
      Effect.catchAll((error) => {
        const errorMessage = error._tag === 'ValidationError'
          ? `Validation error: ${error.message}`
          : error._tag === 'UnauthorizedError'
          ? 'Current password is incorrect'
          : error._tag === 'NetworkError'
          ? `Network error: ${error.message}`
          : 'Failed to change password';

        console.error('Failed to change password:', errorMessage);
        alert(`Error: ${errorMessage}`);

        return Effect.void;
      }),
      Effect.tap(() => Effect.sync(() => setLoading(false))),
      Effect.provide(ProfileModuleLayer)
    );

    await RuntimeClient.runPromise(changePasswordEffect);
  };

  const handleRevokeSession = async (sessionId: string) => {
    const revokeEffect = pipe(
      Effect.flatMap(ProfileService, (service) => service.revokeSession(profile.id, sessionId)),
      Effect.tap(() => {
        console.log('Session revoked successfully');
        // Refresh sessions list
        loadSessions();
      }),
      Effect.catchAll((error) => {
        console.error('Failed to revoke session:', error);
        alert('Error: Failed to revoke session');
        return Effect.void;
      }),
      Effect.provide(ProfileModuleLayer)
    );

    await RuntimeClient.runPromise(revokeEffect);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  };

  const sessionRows = sessions.map((session) => (
    <Table.Tr key={session.id}>
      <Table.Td>
        <Stack gap="xs">
          <Group gap="xs">
            <Text size="sm" fw={500}>{session.deviceInfo}</Text>
            {session.isCurrent && (
              <Badge color="green" size="xs">Current</Badge>
            )}
          </Group>
          <Text size="xs" c="dimmed">{session.ipAddress}</Text>
          {session.location && (
            <Text size="xs" c="dimmed">{session.location}</Text>
          )}
        </Stack>
      </Table.Td>
      <Table.Td>
        <Stack gap="xs">
          <Text size="sm">Created: {formatDate(session.createdAt)}</Text>
          <Text size="sm">Last active: {formatDate(session.lastActiveAt)}</Text>
        </Stack>
      </Table.Td>
      <Table.Td>
        {!session.isCurrent && (
          <ActionIcon
            color="red"
            variant="light"
            onClick={() => handleRevokeSession(session.id)}
          >
            <IconTrash size={16} />
          </ActionIcon>
        )}
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <>
      <Stack gap="lg">
        {/* Password Section */}
        <Card withBorder radius="md" p="lg">
          <Group justify="space-between" mb="md">
            <Group gap="sm">
              <IconLock size={20} />
              <Title order={4}>Password</Title>
            </Group>
            <Button
              variant="light"
              leftSection={<IconKey size={16} />}
              onClick={openPasswordModal}
            >
              Change Password
            </Button>
          </Group>

          <Text size="sm" c="dimmed">
            Keep your account secure by using a strong password and changing it regularly.
          </Text>
        </Card>

        {/* Active Sessions */}
        <Card withBorder radius="md" p="lg" pos="relative">
          <LoadingOverlay visible={sessionsLoading} />

          <Group justify="space-between" mb="md">
            <Group gap="sm">
              <IconDevices size={20} />
              <Title order={4}>Active Sessions</Title>
            </Group>
            <Button
              variant="light"
              onClick={loadSessions}
              loading={sessionsLoading}
            >
              Refresh
            </Button>
          </Group>

          <Text size="sm" c="dimmed" mb="md">
            These are the devices that are currently signed in to your account.
          </Text>

          {sessions.length > 0 ? (
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Device & Location</Table.Th>
                  <Table.Th>Activity</Table.Th>
                  <Table.Th style={{ width: 50 }}>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>{sessionRows}</Table.Tbody>
            </Table>
          ) : (
            <Alert icon={<IconAlertCircle size={16} />} color="blue">
              No active sessions found.
            </Alert>
          )}
        </Card>

        {/* Security Recommendations */}
        <Card withBorder radius="md" p="lg">
          <Group gap="sm" mb="md">
            <IconShield size={20} />
            <Title order={4}>Security Recommendations</Title>
          </Group>

          <Stack gap="sm">
            <Alert color="blue" variant="light">
              <Text size="sm">
                <strong>Enable Two-Factor Authentication:</strong> Add an extra layer of security to your account.
              </Text>
            </Alert>

            <Alert color="yellow" variant="light">
              <Text size="sm">
                <strong>Regular Password Updates:</strong> Change your password every 3-6 months.
              </Text>
            </Alert>

            <Alert color="green" variant="light">
              <Text size="sm">
                <strong>Monitor Account Activity:</strong> Review your active sessions regularly.
              </Text>
            </Alert>
          </Stack>
        </Card>
      </Stack>

      {/* Change Password Modal */}
      <Modal
        opened={passwordModalOpened}
        onClose={closePasswordModal}
        title="Change Password"
        centered
      >
        <form onSubmit={passwordForm.onSubmit(handlePasswordChange)}>
          <Stack gap="md">
            <PasswordInput
              label="Current Password"
              placeholder="Enter your current password"
              required
              {...passwordForm.getInputProps('currentPassword')}
            />

            <PasswordInput
              label="New Password"
              placeholder="Enter your new password"
              required
              {...passwordForm.getInputProps('newPassword')}
            />

            <PasswordInput
              label="Confirm New Password"
              placeholder="Confirm your new password"
              required
              {...passwordForm.getInputProps('confirmPassword')}
            />

            <Group justify="flex-end" gap="xs">
              <Button variant="light" onClick={closePasswordModal}>
                Cancel
              </Button>
              <Button type="submit" loading={loading}>
                Change Password
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </>
  );
}
