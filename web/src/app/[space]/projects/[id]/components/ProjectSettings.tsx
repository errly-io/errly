import { Suspense } from 'react';
import { Stack, Skeleton } from '@mantine/core';
import { getProjectApiKeys } from '@/lib/actions/apiKeys';
import { ProjectWithSettings } from '@/lib/types/database';
import { ApiKeysManager } from './ApiKeysManager';
import { ProjectSettingsForm } from './ProjectSettingsForm';

interface ProjectSettingsProps {
  project: ProjectWithSettings;
  space: string;
}

export async function ProjectSettings({ project, space }: ProjectSettingsProps) {
  // Get API keys for project
  const apiKeys = await getProjectApiKeys(project.id);

  return (
    <Stack gap="lg">
      {/* General Settings Form */}
      <Suspense fallback={<Skeleton height={400} />}>
        <ProjectSettingsForm project={project} space={space} />
      </Suspense>

      {/* API Keys Management */}
      <Suspense fallback={<Skeleton height={300} />}>
        <ApiKeysManager projectId={project.id} apiKeys={apiKeys} />
      </Suspense>
    </Stack>
  );
}
