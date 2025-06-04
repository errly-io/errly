'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Tabs, Skeleton } from '@mantine/core';
import { IconActivity, IconBug, IconSettings } from '@tabler/icons-react';
import { ProjectOverview } from './ProjectOverview';
import { ProjectIssues } from './ProjectIssues';
import { ProjectSettings } from './ProjectSettings';
import { ProjectWithSettings, ProjectStats, Issue, PaginatedResponse } from '@/lib/types/database';

interface ProjectTabsProps {
  activeTab: string;
  project: ProjectWithSettings;
  projectStats: ProjectStats;
  recentIssues: PaginatedResponse<Issue>;
  timeRange: string;
  space: string;
}

export function ProjectTabs({
  activeTab,
  project,
  projectStats,
  recentIssues,
  timeRange,
  space
}: ProjectTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleTabChange = (value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== 'overview') {
      params.set('tab', value);
    } else {
      params.delete('tab');
    }
    const queryString = params.toString();
    const url = queryString ? `?${queryString}` : '';
    router.push(url, { scroll: false });
  };

  return (
    <Tabs value={activeTab} onChange={handleTabChange}>
      <Tabs.List mb="lg">
        <Tabs.Tab value="overview" leftSection={<IconActivity size={16} />}>
          Overview
        </Tabs.Tab>
        <Tabs.Tab value="issues" leftSection={<IconBug size={16} />}>
          Issues ({projectStats.unresolved_issues})
        </Tabs.Tab>
        <Tabs.Tab value="settings" leftSection={<IconSettings size={16} />}>
          Settings
        </Tabs.Tab>
      </Tabs.List>

      <Tabs.Panel value="overview">
        <Suspense fallback={<Skeleton height={400} />}>
          <ProjectOverview
            project={project}
            stats={projectStats}
            recentIssues={recentIssues}
            timeRange={timeRange}
            space={space}
          />
        </Suspense>
      </Tabs.Panel>

      <Tabs.Panel value="issues">
        <Suspense fallback={<Skeleton height={400} />}>
          <ProjectIssues
            projectId={project.id}
            space={space}
          />
        </Suspense>
      </Tabs.Panel>

      <Tabs.Panel value="settings">
        <Suspense fallback={<Skeleton height={400} />}>
          <ProjectSettings
            project={project}
            space={space}
          />
        </Suspense>
      </Tabs.Panel>
    </Tabs>
  );
}
