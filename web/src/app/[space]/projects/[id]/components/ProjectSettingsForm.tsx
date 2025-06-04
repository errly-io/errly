'use client';

import { useState, useTransition } from 'react';
import {
  Card,
  Title,
  Text,
  Group,
  Badge,
  Stack,
  Button,
  TextInput,
  Textarea,
  NumberInput,
  MultiSelect,
  Switch,
  Divider,
  Alert,
  Modal
} from '@mantine/core';
import {
  IconTrash,
  IconAlertTriangle,
  IconCheck
} from '@tabler/icons-react';
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import { updateProject, deleteProject } from '@/lib/actions/projects';
import { ProjectWithSettings } from '@/lib/types/database';

interface ProjectSettingsFormProps {
  project: ProjectWithSettings;
  space: string;
}

export function ProjectSettingsForm({ project, space }: ProjectSettingsFormProps) {
  const [isPending, startTransition] = useTransition();
  const [deleteModalOpened, { open: openDeleteModal, close: closeDeleteModal }] = useDisclosure(false);
  const [updateResult, setUpdateResult] = useState<{ success: boolean; error?: string } | null>(null);

  const form = useForm({
    initialValues: {
      name: project.name,
      description: project.description || '',
      environments: project.settings?.environments || [],
      retention_days: project.settings?.retention_days || 30,
      sample_rate: project.settings?.sample_rate || 1.0,
    },
    validate: {
      name: (value: string) => (value.trim().length === 0 ? 'Project name is required' : null),
      retention_days: (value: number) => (value < 1 || value > 365 ? 'Retention must be between 1 and 365 days' : null),
      sample_rate: (value: number) => (value < 0 || value > 1 ? 'Sample rate must be between 0 and 1' : null),
    },
  });

  const handleSubmit = (values: typeof form.values) => {
    startTransition(async () => {
      const formData = new FormData();
      formData.append('name', values.name);
      formData.append('description', values.description);
      formData.append('settings', JSON.stringify({
        ...(project.settings || {}),
        environments: values.environments,
        retention_days: values.retention_days,
        sample_rate: values.sample_rate,
      }));

      const result = await updateProject(project.id, formData);
      setUpdateResult(result);

      if (result.success) {
        setTimeout(() => setUpdateResult(null), 3000);
      }
    });
  };

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteProject(project.id, space);
      if (result.success) {
        // Redirect will happen automatically via the action
      } else {
        setUpdateResult(result);
      }
    });
  };

  const environmentOptions = [
    { value: 'development', label: 'Development' },
    { value: 'staging', label: 'Staging' },
    { value: 'testing', label: 'Testing' },
    { value: 'production', label: 'Production' },
  ];

  return (
    <Stack gap="lg">
      {/* Update Result Alert */}
      {updateResult && (
        <Alert
          color={updateResult.success ? 'green' : 'red'}
          icon={updateResult.success ? <IconCheck size={16} /> : <IconAlertTriangle size={16} />}
          onClose={() => setUpdateResult(null)}
          withCloseButton
        >
          {updateResult.success ? 'Project updated successfully!' : updateResult.error}
        </Alert>
      )}

      {/* General Settings */}
      <Card withBorder radius="md" p="lg">
        <Title order={4} mb="md">General Settings</Title>

        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="md">
            <TextInput
              label="Project Name"
              placeholder="Enter project name"
              required
              {...form.getInputProps('name')}
            />

            <Textarea
              label="Description"
              placeholder="Describe your project"
              rows={3}
              {...form.getInputProps('description')}
            />

            <MultiSelect
              label="Environments"
              placeholder="Select environments"
              data={environmentOptions}
              {...form.getInputProps('environments')}
            />

            <Group grow>
              <NumberInput
                label="Data Retention (days)"
                placeholder="30"
                min={1}
                max={365}
                {...form.getInputProps('retention_days')}
              />

              <NumberInput
                label="Sample Rate"
                placeholder="1.0"
                min={0}
                max={1}
                step={0.1}
                decimalScale={1}
                {...form.getInputProps('sample_rate')}
              />
            </Group>

            <Group justify="flex-end">
              <Button
                type="submit"
                loading={isPending}
                leftSection={<IconCheck size={16} />}
              >
                Save Changes
              </Button>
            </Group>
          </Stack>
        </form>
      </Card>

      {/* Project Information */}
      <Card withBorder radius="md" p="lg">
        <Title order={4} mb="md">Project Information</Title>

        <Stack gap="md">
          <Group justify="space-between">
            <Text size="sm" c="dimmed">Project ID</Text>
            <Text size="sm" ff="monospace">{project.id}</Text>
          </Group>

          <Group justify="space-between">
            <Text size="sm" c="dimmed">Platform</Text>
            <Badge variant="light">{project.platform}</Badge>
          </Group>

          {project.framework && (
            <Group justify="space-between">
              <Text size="sm" c="dimmed">Framework</Text>
              <Badge variant="outline">{project.framework}</Badge>
            </Group>
          )}

          <Group justify="space-between">
            <Text size="sm" c="dimmed">Slug</Text>
            <Text size="sm" ff="monospace">{project.slug}</Text>
          </Group>

          <Group justify="space-between">
            <Text size="sm" c="dimmed">Created</Text>
            <Text size="sm">{project.created_at ? new Date(project.created_at).toLocaleDateString() : 'N/A'}</Text>
          </Group>

          <Group justify="space-between">
            <Text size="sm" c="dimmed">Last Updated</Text>
            <Text size="sm">{project.updated_at ? new Date(project.updated_at).toLocaleDateString() : 'N/A'}</Text>
          </Group>
        </Stack>
      </Card>

      {/* Security Settings */}
      <Card withBorder radius="md" p="lg">
        <Title order={4} mb="md">Security & Privacy</Title>

        <Stack gap="md">
          <Group justify="space-between">
            <div>
              <Text size="sm" fw={500}>Data Scrubbing</Text>
              <Text size="xs" c="dimmed">
                Automatically remove sensitive data from error reports
              </Text>
            </div>
            <Switch defaultChecked disabled />
          </Group>

          <Group justify="space-between">
            <div>
              <Text size="sm" fw={500}>IP Address Collection</Text>
              <Text size="xs" c="dimmed">
                Collect user IP addresses for debugging
              </Text>
            </div>
            <Switch defaultChecked disabled />
          </Group>

          <Group justify="space-between">
            <div>
              <Text size="sm" fw={500}>User Context</Text>
              <Text size="xs" c="dimmed">
                Collect user information when available
              </Text>
            </div>
            <Switch defaultChecked disabled />
          </Group>
        </Stack>

        <Alert color="blue" variant="light" mt="md">
          <Text size="sm">
            Security settings will be configurable in a future update.
          </Text>
        </Alert>
      </Card>

      {/* Danger Zone */}
      <Card withBorder radius="md" p="lg" bg="red.0">
        <Group gap="xs" mb="md">
          <IconAlertTriangle size={20} color="red" />
          <Title order={4} c="red">Danger Zone</Title>
        </Group>

        <Text size="sm" c="dimmed" mb="md">
          These actions are irreversible. Please be careful.
        </Text>

        <Divider mb="md" />

        <Group justify="space-between">
          <div>
            <Text size="sm" fw={500}>Delete Project</Text>
            <Text size="xs" c="dimmed">
              Permanently delete this project and all its data
            </Text>
          </div>
          <Button
            color="red"
            variant="light"
            leftSection={<IconTrash size={16} />}
            onClick={openDeleteModal}
          >
            Delete Project
          </Button>
        </Group>
      </Card>

      {/* Delete Confirmation Modal */}
      <Modal
        opened={deleteModalOpened}
        onClose={closeDeleteModal}
        title="Delete Project"
        centered
      >
        <Stack gap="md">
          <Alert color="red" variant="light">
            <Text size="sm">
              This action cannot be undone. This will permanently delete the project{' '}
              <strong>{project.name}</strong> and all associated data.
            </Text>
          </Alert>

          <Text size="sm" c="dimmed">
            All issues, events, settings, and API keys will be permanently removed.
          </Text>

          <Group justify="flex-end" gap="sm">
            <Button variant="light" onClick={closeDeleteModal}>
              Cancel
            </Button>
            <Button
              color="red"
              onClick={handleDelete}
              loading={isPending}
              leftSection={<IconTrash size={16} />}
            >
              Delete Project
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
