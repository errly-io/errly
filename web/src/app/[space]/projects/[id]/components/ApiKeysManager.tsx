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
  Table,
  ActionIcon,
  Menu,
  Modal,
  TextInput,
  MultiSelect,

  Alert,
  Code,
  Tooltip,
  CopyButton
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import {
  IconKey,
  IconPlus,
  IconDots,
  IconEdit,
  IconTrash,
  IconCopy,
  IconCheck,
  IconAlertTriangle
} from '@tabler/icons-react';
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import { formatDate } from '@/utils/dateFormat';
import {
  createApiKey,
  updateApiKeyName,
  deleteApiKey,
  cleanupExpiredApiKeys
} from '@/lib/actions/apiKeys';
import {
  getScopeDisplayName,
  getScopeColor,
  maskApiKey,
  getKeyStatus
} from '@/lib/utils/apiKeys';
import { ApiKey, ApiKeyWithToken, ApiKeyScope } from '@/lib/types/database';

interface ApiKeysManagerProps {
  projectId: string;
  apiKeys: ApiKey[];
}

export function ApiKeysManager({ projectId, apiKeys }: ApiKeysManagerProps) {
  const [isPending, startTransition] = useTransition();
  const [createModalOpened, { open: openCreateModal, close: closeCreateModal }] = useDisclosure(false);
  const [editModalOpened, { open: openEditModal, close: closeEditModal }] = useDisclosure(false);
  const [deleteModalOpened, { open: openDeleteModal, close: closeDeleteModal }] = useDisclosure(false);
  const [newApiKey, setNewApiKey] = useState<ApiKeyWithToken | null>(null);
  const [selectedKey, setSelectedKey] = useState<ApiKey | null>(null);
  const [actionResult, setActionResult] = useState<{ success: boolean; error?: string } | null>(null);

  const createForm = useForm({
    initialValues: {
      name: '',
      scopes: ['ingest'] as ApiKeyScope[],
      expires_at: null as Date | null,
    },
    validate: {
      name: (value) => (value.trim().length === 0 ? 'API key name is required' : null),
      scopes: (value) => (value.length === 0 ? 'At least one scope is required' : null),
    },
  });

  const editForm = useForm({
    initialValues: {
      name: '',
    },
    validate: {
      name: (value) => (value.trim().length === 0 ? 'API key name is required' : null),
    },
  });

  const handleCreateSubmit = (values: typeof createForm.values) => {
    startTransition(async () => {
      const formData = new FormData();
      formData.append('name', values.name);
      formData.append('scopes', JSON.stringify(values.scopes));
      if (values.expires_at) {
        formData.append('expires_at', values.expires_at.toISOString());
      }

      const result = await createApiKey(projectId, formData);

      if (result.success && result.data) {
        setNewApiKey(result.data);
        createForm.reset();
        closeCreateModal();
      } else {
        setActionResult(result);
      }
    });
  };

  const handleEditSubmit = (values: typeof editForm.values) => {
    if (!selectedKey) return;

    startTransition(async () => {
      const result = await updateApiKeyName(selectedKey.id, values.name);

      if (result.success) {
        editForm.reset();
        closeEditModal();
        setSelectedKey(null);
      } else {
        setActionResult(result);
      }
    });
  };

  const handleDelete = () => {
    if (!selectedKey) return;

    startTransition(async () => {
      const result = await deleteApiKey(selectedKey.id);

      if (result.success) {
        closeDeleteModal();
        setSelectedKey(null);
      } else {
        setActionResult(result);
      }
    });
  };

  const handleCleanupExpired = () => {
    startTransition(async () => {
      const result = await cleanupExpiredApiKeys(projectId);

      if (result.success) {
        setActionResult({
          success: true,
          error: `Cleaned up ${result.data?.deletedCount || 0} expired keys`
        });
      } else {
        setActionResult(result);
      }
    });
  };

  const openEditModalForKey = (key: ApiKey) => {
    setSelectedKey(key);
    editForm.setValues({ name: key.name });
    openEditModal();
  };

  const openDeleteModalForKey = (key: ApiKey) => {
    setSelectedKey(key);
    openDeleteModal();
  };

  const scopeOptions = [
    { value: 'ingest', label: 'Send Events' },
    { value: 'read', label: 'Read Data' },
    { value: 'admin', label: 'Full Access' },
  ];

  const expiredKeys = apiKeys.filter(key => getKeyStatus(key.expires_at, key.last_used_at).status === 'expired');

  return (
    <Stack gap="md">
      {/* Action Result Alert */}
      {actionResult && (
        <Alert
          color={actionResult.success ? 'green' : 'red'}
          icon={actionResult.success ? <IconCheck size={16} /> : <IconAlertTriangle size={16} />}
          onClose={() => setActionResult(null)}
          withCloseButton
        >
          {actionResult.success ? 'Success!' : actionResult.error}
        </Alert>
      )}

      {/* New API Key Display */}
      {newApiKey && newApiKey.token && (
        <Alert color="green" variant="light">
          <Stack gap="sm">
            <Group justify="space-between">
              <Text fw={500}>API Key Created Successfully!</Text>
              <Button
                size="xs"
                variant="light"
                onClick={() => setNewApiKey(null)}
              >
                Dismiss
              </Button>
            </Group>
            <Text size="sm" c="dimmed">
              Copy this key now - it won't be shown again:
            </Text>
            <Group gap="xs">
              <Code style={{ flex: 1, fontSize: '12px' }}>
                {newApiKey.token}
              </Code>
              <CopyButton value={newApiKey.token}>
                {({ copied, copy }) => (
                  <Button
                    size="xs"
                    variant="light"
                    leftSection={copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                    onClick={copy}
                  >
                    {copied ? 'Copied' : 'Copy'}
                  </Button>
                )}
              </CopyButton>
            </Group>
          </Stack>
        </Alert>
      )}

      {/* Header */}
      <Group justify="space-between">
        <div>
          <Title order={4}>API Keys</Title>
          <Text size="sm" c="dimmed">
            Manage API keys for authenticating with the Errly API
          </Text>
        </div>

        <Group gap="xs">
          {expiredKeys.length > 0 && (
            <Button
              variant="light"
              size="sm"
              color="orange"
              onClick={handleCleanupExpired}
              loading={isPending}
            >
              Cleanup Expired ({expiredKeys.length})
            </Button>
          )}
          <Button
            leftSection={<IconPlus size={16} />}
            onClick={openCreateModal}
            disabled={apiKeys.length >= 10}
          >
            Create API Key
          </Button>
        </Group>
      </Group>

      {/* API Keys Table */}
      {apiKeys.length === 0 ? (
        <Card withBorder radius="md" p="xl" style={{ textAlign: 'center' }}>
          <IconKey size={48} color="var(--mantine-color-gray-5)" style={{ margin: '0 auto 1rem' }} />
          <Title order={4} mb="xs">No API Keys</Title>
          <Text c="dimmed" mb="lg">
            Create your first API key to start sending error data to this project.
          </Text>
          <Button
            leftSection={<IconPlus size={16} />}
            onClick={openCreateModal}
          >
            Create API Key
          </Button>
        </Card>
      ) : (
        <Card withBorder radius="md" p={0}>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Name</Table.Th>
                <Table.Th>Key</Table.Th>
                <Table.Th>Scopes</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Last Used</Table.Th>
                <Table.Th>Created</Table.Th>
                <Table.Th style={{ width: 60 }}>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {apiKeys.map((key) => {
                const status = getKeyStatus(key.expires_at, key.last_used_at);

                return (
                  <Table.Tr key={key.id}>
                    <Table.Td>
                      <Text fw={500}>{key.name}</Text>
                    </Table.Td>

                    <Table.Td>
                      <Group gap="xs">
                        <Code>{maskApiKey(key.key_prefix)}</Code>
                        <CopyButton value={key.key_prefix}>
                          {({ copied, copy }) => (
                            <Tooltip label={copied ? 'Copied!' : 'Copy prefix'}>
                              <ActionIcon
                                size="sm"
                                variant="subtle"
                                onClick={copy}
                              >
                                {copied ? <IconCheck size={12} /> : <IconCopy size={12} />}
                              </ActionIcon>
                            </Tooltip>
                          )}
                        </CopyButton>
                      </Group>
                    </Table.Td>

                    <Table.Td>
                      <Group gap="xs">
                        {key.scopes.map((scope: string) => (
                          <Badge
                            key={scope}
                            size="xs"
                            variant="light"
                            color={getScopeColor(scope)}
                          >
                            {getScopeDisplayName(scope)}
                          </Badge>
                        ))}
                      </Group>
                    </Table.Td>

                    <Table.Td>
                      <Badge
                        size="sm"
                        variant="light"
                        color={status.color}
                      >
                        {status.label}
                      </Badge>
                    </Table.Td>

                    <Table.Td>
                      <Text size="sm" c="dimmed">
                        {key.last_used_at ? formatDate(key.last_used_at) : 'Never'}
                      </Text>
                    </Table.Td>

                    <Table.Td>
                      <Text size="sm" c="dimmed">
                        {key.created_at ? formatDate(key.created_at) : 'N/A'}
                      </Text>
                    </Table.Td>

                    <Table.Td>
                      <Menu shadow="md" width={160}>
                        <Menu.Target>
                          <ActionIcon variant="subtle" color="gray">
                            <IconDots size={16} />
                          </ActionIcon>
                        </Menu.Target>
                        <Menu.Dropdown>
                          <Menu.Item
                            leftSection={<IconEdit size={16} />}
                            onClick={() => openEditModalForKey(key)}
                          >
                            Edit Name
                          </Menu.Item>
                          <Menu.Divider />
                          <Menu.Item
                            leftSection={<IconTrash size={16} />}
                            color="red"
                            onClick={() => openDeleteModalForKey(key)}
                          >
                            Delete
                          </Menu.Item>
                        </Menu.Dropdown>
                      </Menu>
                    </Table.Td>
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>
        </Card>
      )}

      {/* Create API Key Modal */}
      <Modal
        opened={createModalOpened}
        onClose={closeCreateModal}
        title="Create API Key"
        size="md"
      >
        <form onSubmit={createForm.onSubmit(handleCreateSubmit)}>
          <Stack gap="md">
            <TextInput
              label="Name"
              placeholder="Enter a descriptive name"
              required
              {...createForm.getInputProps('name')}
            />

            <MultiSelect
              label="Scopes"
              placeholder="Select permissions"
              data={scopeOptions}
              required
              {...createForm.getInputProps('scopes')}
            />

            <DateInput
              label="Expiration Date (Optional)"
              placeholder="Select expiration date"
              minDate={new Date()}
              {...createForm.getInputProps('expires_at')}
            />

            <Group justify="flex-end" gap="sm">
              <Button variant="light" onClick={closeCreateModal}>
                Cancel
              </Button>
              <Button
                type="submit"
                loading={isPending}
                leftSection={<IconKey size={16} />}
              >
                Create API Key
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* Edit API Key Modal */}
      <Modal
        opened={editModalOpened}
        onClose={closeEditModal}
        title="Edit API Key"
        size="sm"
      >
        <form onSubmit={editForm.onSubmit(handleEditSubmit)}>
          <Stack gap="md">
            <TextInput
              label="Name"
              placeholder="Enter a descriptive name"
              required
              {...editForm.getInputProps('name')}
            />

            <Group justify="flex-end" gap="sm">
              <Button variant="light" onClick={closeEditModal}>
                Cancel
              </Button>
              <Button
                type="submit"
                loading={isPending}
                leftSection={<IconEdit size={16} />}
              >
                Update Name
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        opened={deleteModalOpened}
        onClose={closeDeleteModal}
        title="Delete API Key"
        centered
      >
        <Stack gap="md">
          <Alert color="red" variant="light">
            <Text size="sm">
              This action cannot be undone. The API key{' '}
              <strong>{selectedKey?.name}</strong> will be permanently deleted.
            </Text>
          </Alert>

          <Text size="sm" c="dimmed">
            Any applications using this key will no longer be able to send data.
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
              Delete API Key
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
