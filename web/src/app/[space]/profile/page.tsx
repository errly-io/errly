'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Container,
  Grid,
  Tabs,
  Title,
  LoadingOverlay,
  Alert,
  Center,
  Button
} from '@mantine/core';

import {
  IconUser,
  IconShield,
  IconBell,
  IconActivity,
  IconAlertCircle,
  IconLogin
} from '@tabler/icons-react';
import { Effect, pipe } from 'effect';
import { ProfileService, ProfileModuleLayer } from '@/modules/profile/di';
import { ProfileResponse } from '@/modules/profile/application/dto/ProfileResponse';
import { ProfileForm } from '@/modules/profile/components/ProfileForm/ProfileForm';
import { ProfileAvatar } from '@/modules/profile/components/ProfileAvatar/ProfileAvatar';
import { ProfileSecurity } from '@/modules/profile/components/ProfileSecurity/ProfileSecurity';
import { RuntimeClient } from '@/modules/shared/clientRuntime';

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('profile');

  useEffect(() => {
    if (status === 'loading') return;

    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }

    if (session?.user?.id) {
      loadProfile(session.user.id);
    } else if (status === 'authenticated') {
      // Fallback to default user ID for demo
      loadProfile('1');
    }
  }, [session, status, router]);

  const loadProfile = async (userId: string) => {
    setLoading(true);
    setError(null);

    const profileEffect = pipe(
      Effect.flatMap(ProfileService, (service) => service.getProfile(userId)),
      Effect.tap((profile) => {
        setProfile(profile);
      }),
      Effect.catchAll((error) => {
        const errorMessage = error._tag === 'UserNotFoundError'
          ? 'Profile not found'
          : error._tag === 'NetworkError'
          ? `Network error: ${error.message}`
          : error._tag === 'UnauthorizedError'
          ? 'You are not authorized to view this profile'
          : 'Failed to load profile';

        setError(errorMessage);
        console.error('Failed to load profile:', errorMessage);

        return Effect.void;
      }),
      Effect.tap(() => Effect.sync(() => setLoading(false))),
      Effect.provide(ProfileModuleLayer)
    );

    await RuntimeClient.runPromise(profileEffect);
  };

  const handleProfileUpdate = (updatedProfile: ProfileResponse) => {
    setProfile(updatedProfile);
  };

  const handleAvatarUpdate = (avatarUrl: string | undefined) => {
    if (profile) {
      setProfile({
        ...profile,
        avatar: avatarUrl,
        updatedAt: new Date()
      });
    }
  };

  if (status === 'loading' || loading) {
    return (
      <Container size="lg" py="xl">
        <LoadingOverlay visible />
      </Container>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <Container size="sm" py="xl">
        <Center>
          <Alert
            icon={<IconLogin size={16} />}
            title="Authentication Required"
            color="blue"
          >
            Please sign in to view your profile.
            <Button
              variant="light"
              size="sm"
              mt="sm"
              onClick={() => router.push('/auth/signin')}
            >
              Sign In
            </Button>
          </Alert>
        </Center>
      </Container>
    );
  }

  if (error || !profile) {
    return (
      <Container size="lg" py="xl">
        <Alert
          icon={<IconAlertCircle size={16} />}
          title="Error"
          color="red"
        >
          {error || 'Failed to load profile'}
          <Button
            variant="light"
            size="sm"
            mt="sm"
            onClick={() => {
              const userId = session?.user?.id || '1';
              loadProfile(userId);
            }}
          >
            Retry
          </Button>
        </Alert>
      </Container>
    );
  }

  return (
    <Container size="lg" py="xl">
      <Title order={1} mb="xl">Profile Settings</Title>

      <Grid>
        <Grid.Col span={{ base: 12, md: 4 }}>
          <ProfileAvatar
            profile={profile}
            onAvatarUpdate={handleAvatarUpdate}
          />
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 8 }}>
          <Tabs value={activeTab} onChange={(value) => setActiveTab(value || 'profile')}>
            <Tabs.List>
              <Tabs.Tab value="profile" leftSection={<IconUser size={16} />}>
                Profile
              </Tabs.Tab>
              <Tabs.Tab value="security" leftSection={<IconShield size={16} />}>
                Security
              </Tabs.Tab>
              <Tabs.Tab value="notifications" leftSection={<IconBell size={16} />}>
                Notifications
              </Tabs.Tab>
              <Tabs.Tab value="activity" leftSection={<IconActivity size={16} />}>
                Activity
              </Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="profile" pt="lg">
              <ProfileForm
                profile={profile}
                onProfileUpdate={handleProfileUpdate}
              />
            </Tabs.Panel>

            <Tabs.Panel value="security" pt="lg">
              <ProfileSecurity profile={profile} />
            </Tabs.Panel>

            <Tabs.Panel value="notifications" pt="lg">
              <Alert color="blue" icon={<IconBell size={16} />}>
                Notification settings are managed in the Profile tab under Preferences.
              </Alert>
            </Tabs.Panel>

            <Tabs.Panel value="activity" pt="lg">
              <Alert color="blue" icon={<IconActivity size={16} />}>
                Activity tracking feature is coming soon. You can view your active sessions in the Security tab.
              </Alert>
            </Tabs.Panel>
          </Tabs>
        </Grid.Col>
      </Grid>
    </Container>
  );
}
