'use client';

import { useState } from 'react';
import {
  Card,
  TextInput,
  Button,
  Group,
  Stack,
  Switch,
  Select,
  Title,
  Alert,
  LoadingOverlay
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconAlertCircle } from '@tabler/icons-react';
import { Effect, pipe } from 'effect';
import { ProfileService, ProfileModuleLayer } from '@/modules/profile/di';
import { ProfileResponse } from '@/modules/profile/application/dto/ProfileResponse';
import { UpdateProfileRequest } from '@/modules/profile/application/dto/UpdateProfileRequest';
import { RuntimeClient } from '@/modules/shared/clientRuntime';

interface ProfileFormProps {
  profile: ProfileResponse;
  onProfileUpdate?: (profile: ProfileResponse) => void;
}

export function ProfileForm({ profile, onProfileUpdate }: Readonly<ProfileFormProps>) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<UpdateProfileRequest>({
    initialValues: {
      name: profile.name,
      preferences: {
        emailNotifications: profile.preferences.emailNotifications,
        pushNotifications: profile.preferences.pushNotifications,
        weeklyDigest: profile.preferences.weeklyDigest,
        theme: profile.preferences.theme,
        language: profile.preferences.language,
        timezone: profile.preferences.timezone
      }
    },
    validate: {
      name: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Name is required';
        }
        if (value.length > 100) {
          return 'Name must be less than 100 characters';
        }
        return null;
      }
    }
  });

  const handleSubmit = async (values: UpdateProfileRequest) => {
    setLoading(true);
    setError(null);

    const updateEffect = pipe(
      Effect.flatMap(ProfileService, (service) => service.updateProfile(profile.id, values)),
      Effect.tap((updatedProfile) => {
        console.log('Profile updated successfully');
        onProfileUpdate?.(updatedProfile);
      }),
      Effect.catchAll((error) => {
        let errorMessage: string;
        if (error._tag === 'ValidationError') {
          errorMessage = `Validation error: ${error.message}`;
        } else if (error._tag === 'NetworkError') {
          errorMessage = `Network error: ${error.message}`;
        } else {
          errorMessage = 'Failed to update profile';
        }

        setError(errorMessage);
        console.error('Failed to update profile:', errorMessage);

        return Effect.void;
      }),
      Effect.tap(() => Effect.sync(() => setLoading(false))),
      Effect.provide(ProfileModuleLayer)
    );

    await RuntimeClient.runPromise(updateEffect);
  };

  const timezoneOptions = [
    { value: 'UTC', label: 'UTC' },
    { value: 'America/New_York', label: 'Eastern Time' },
    { value: 'America/Chicago', label: 'Central Time' },
    { value: 'America/Denver', label: 'Mountain Time' },
    { value: 'America/Los_Angeles', label: 'Pacific Time' },
    { value: 'Europe/London', label: 'London' },
    { value: 'Europe/Paris', label: 'Paris' },
    { value: 'Europe/Moscow', label: 'Moscow' },
    { value: 'Asia/Tokyo', label: 'Tokyo' },
    { value: 'Asia/Shanghai', label: 'Shanghai' }
  ];

  const languageOptions = [
    { value: 'en', label: 'English' },
    { value: 'ru', label: 'Русский' },
    { value: 'es', label: 'Español' },
    { value: 'fr', label: 'Français' },
    { value: 'de', label: 'Deutsch' }
  ];

  const themeOptions = [
    { value: 'auto', label: 'Auto' },
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' }
  ];

  return (
    <Card withBorder radius="md" p="lg" pos="relative">
      <LoadingOverlay visible={loading} />

      <Title order={3} mb="md">Profile Settings</Title>

      {error && (
        <Alert
          icon={<IconAlertCircle size={16} />}
          color="red"
          mb="md"
          onClose={() => setError(null)}
          withCloseButton
        >
          {error}
        </Alert>
      )}

      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          <TextInput
            label="Full Name"
            placeholder="Enter your full name"
            required
            {...form.getInputProps('name')}
          />

          <TextInput
            label="Email"
            value={profile.email}
            disabled
            description="Email cannot be changed. Contact support if you need to update it."
          />

          <Title order={4} mt="lg" mb="sm">Preferences</Title>

          <Group grow>
            <Select
              label="Theme"
              data={themeOptions}
              {...form.getInputProps('preferences.theme')}
            />
            <Select
              label="Language"
              data={languageOptions}
              {...form.getInputProps('preferences.language')}
            />
          </Group>

          <Select
            label="Timezone"
            data={timezoneOptions}
            searchable
            {...form.getInputProps('preferences.timezone')}
          />

          <Title order={4} mt="lg" mb="sm">Notifications</Title>

          <Stack gap="xs">
            <Switch
              label="Email Notifications"
              description="Receive notifications via email"
              {...form.getInputProps('preferences.emailNotifications', { type: 'checkbox' })}
            />
            <Switch
              label="Push Notifications"
              description="Receive push notifications in browser"
              {...form.getInputProps('preferences.pushNotifications', { type: 'checkbox' })}
            />
            <Switch
              label="Weekly Digest"
              description="Receive weekly summary emails"
              {...form.getInputProps('preferences.weeklyDigest', { type: 'checkbox' })}
            />
          </Stack>

          <Group justify="flex-end" mt="lg">
            <Button
              type="submit"
              loading={loading}
              disabled={!form.isDirty()}
            >
              Save Changes
            </Button>
          </Group>
        </Stack>
      </form>
    </Card>
  );
}
