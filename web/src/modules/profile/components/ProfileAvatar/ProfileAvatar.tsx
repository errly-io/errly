'use client';

import { useState } from 'react';
import {
  Avatar,
  Button,
  Group,
  Stack,
  Text,
  ActionIcon,
  Modal,
  FileInput,
  Card,
  LoadingOverlay
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconCamera, IconTrash, IconUpload } from '@tabler/icons-react';
import { Effect, pipe } from 'effect';
import { ProfileService, ProfileModuleLayer } from '@/modules/profile/di';
import { ProfileResponse } from '@/modules/profile/application/dto/ProfileResponse';
import { RuntimeClient } from '@/modules/shared/clientRuntime';

interface ProfileAvatarProps {
  profile: ProfileResponse;
  onAvatarUpdate?: (avatarUrl: string | undefined) => void;
  size?: number;
  editable?: boolean;
}

export function ProfileAvatar({
  profile,
  onAvatarUpdate,
  size = 120,
  editable = true
}: ProfileAvatarProps) {
  const [loading, setLoading] = useState(false);
  const [uploadModalOpened, { open: openUploadModal, close: closeUploadModal }] = useDisclosure(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);


  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleFileSelect = (file: File | null) => {
    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setLoading(true);

    const uploadEffect = pipe(
      Effect.flatMap(ProfileService, (service) => service.uploadAvatar(profile.id, { file: selectedFile })),
      Effect.tap((avatarUrl) => {
        console.log('Avatar uploaded successfully');
        onAvatarUpdate?.(avatarUrl);
        closeUploadModal();
        setSelectedFile(null);
      }),
      Effect.catchAll((error) => {
        const errorMessage = error._tag === 'FileUploadError'
          ? `Upload error: ${error.message}`
          : error._tag === 'ValidationError'
          ? `Validation error: ${error.message}`
          : error._tag === 'NetworkError'
          ? `Network error: ${error.message}`
          : 'Failed to upload avatar';

        console.error('Failed to upload avatar:', errorMessage);
        alert(`Error: ${errorMessage}`);

        return Effect.void;
      }),
      Effect.tap(() => Effect.sync(() => setLoading(false))),
      Effect.provide(ProfileModuleLayer)
    );

    await RuntimeClient.runPromise(uploadEffect);
  };

  const handleDelete = async () => {
    setLoading(true);

    const deleteEffect = pipe(
      Effect.flatMap(ProfileService, (service) => service.deleteAvatar(profile.id)),
      Effect.tap(() => {
        console.log('Avatar deleted successfully');
        onAvatarUpdate?.(undefined);
      }),
      Effect.catchAll((error) => {
        const errorMessage = error._tag === 'NetworkError'
          ? `Network error: ${error.message}`
          : 'Failed to delete avatar';

        console.error('Failed to delete avatar:', errorMessage);
        alert(`Error: ${errorMessage}`);

        return Effect.void;
      }),
      Effect.tap(() => Effect.sync(() => setLoading(false))),
      Effect.provide(ProfileModuleLayer)
    );

    await RuntimeClient.runPromise(deleteEffect);
  };

  const validateFile = (file: File): string | null => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!allowedTypes.includes(file.type)) {
      return 'Please select a valid image file (JPEG, PNG, WebP, or GIF)';
    }

    if (file.size > maxSize) {
      return 'File size must be less than 5MB';
    }

    return null;
  };

  return (
    <>
      <Card withBorder shadow="sm" radius="md" p="lg" pos="relative">
        <LoadingOverlay visible={loading} />

        <Stack align="center" gap="md">
          <div style={{ position: 'relative' }}>
            <Avatar
              src={profile.avatar || null}
              alt={profile.name}
              size={size}
              radius="50%"
            >
              {getInitials(profile.name)}
            </Avatar>

            {editable && (
              <ActionIcon
                variant="filled"
                color="blue"
                size="sm"
                radius="xl"
                style={{
                  position: 'absolute',
                  bottom: 0,
                  right: 0,
                  border: '2px solid white'
                }}
                onClick={openUploadModal}
              >
                <IconCamera size={14} />
              </ActionIcon>
            )}
          </div>

          <Stack align="center" gap="xs">
            <Text fw={600} size="lg">{profile.name}</Text>
            <Text c="dimmed" size="sm">{profile.email}</Text>
            <Text c="dimmed" size="xs">
              Member since {new Date(profile.createdAt).toLocaleDateString()}
            </Text>
          </Stack>

          {editable && (
            <Group gap="xs">
              <Button
                variant="light"
                size="xs"
                leftSection={<IconCamera size={14} />}
                onClick={openUploadModal}
              >
                Change Avatar
              </Button>

              {profile.avatar && (
                <Button
                  variant="light"
                  color="red"
                  size="xs"
                  leftSection={<IconTrash size={14} />}
                  onClick={handleDelete}
                >
                  Remove
                </Button>
              )}
            </Group>
          )}
        </Stack>
      </Card>

      <Modal
        opened={uploadModalOpened}
        onClose={closeUploadModal}
        title="Upload Avatar"
        centered
      >
        <Stack gap="md">
          <FileInput
            label="Select Image"
            placeholder="Choose an image file"
            accept="image/*"
            value={selectedFile}
            onChange={handleFileSelect}
            leftSection={<IconUpload size={16} />}
            error={selectedFile ? validateFile(selectedFile) : null}
          />

          {selectedFile && (
            <div>
              <Text size="sm" c="dimmed">Preview:</Text>
              <Avatar
                src={URL.createObjectURL(selectedFile)}
                alt="Preview"
                size={80}
                radius="50%"
                mx="auto"
                mt="xs"
              />
            </div>
          )}

          <Group justify="flex-end" gap="xs">
            <Button variant="light" onClick={closeUploadModal}>
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!selectedFile || !!validateFile(selectedFile || new File([], ''))}
              loading={loading}
            >
              Upload
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
