'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Group, Button, Menu } from '@mantine/core';
import {
  IconCheck,
  IconEyeOff,
  IconAlertTriangle,
  IconChevronDown
} from '@tabler/icons-react';
import { resolveIssue, ignoreIssue, unresolveIssue } from '@/lib/actions/issues';
import { Issue } from '@/lib/types/database';

interface IssueActionsProps {
  issue: Issue;
  space: string;
}

export function IssueActions({ issue, space }: IssueActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleStatusChange = (status: 'resolved' | 'ignored' | 'unresolved') => {
    startTransition(async () => {
      try {
        let result;
        switch (status) {
          case 'resolved':
            result = await resolveIssue(issue.id, issue.project_id);
            break;
          case 'ignored':
            result = await ignoreIssue(issue.id, issue.project_id);
            break;
          case 'unresolved':
            result = await unresolveIssue(issue.id, issue.project_id);
            break;
        }

        if (result.success) {
          // Redirect back to issues list after successful update
          router.push(`/${space}/issues`);
        } else {
          console.error('Failed to update issue status:', result.error);
        }
      } catch (error) {
        console.error('Error updating issue status:', error);
      }
    });
  };

  const getMainAction = () => {
    switch (issue.status) {
      case 'unresolved':
        return {
          label: 'Resolve',
          icon: IconCheck,
          color: 'green',
          action: () => handleStatusChange('resolved')
        };
      case 'resolved':
        return {
          label: 'Unresolve',
          icon: IconAlertTriangle,
          color: 'red',
          action: () => handleStatusChange('unresolved')
        };
      case 'ignored':
        return {
          label: 'Unresolve',
          icon: IconAlertTriangle,
          color: 'red',
          action: () => handleStatusChange('unresolved')
        };
      default:
        return {
          label: 'Resolve',
          icon: IconCheck,
          color: 'green',
          action: () => handleStatusChange('resolved')
        };
    }
  };

  const getSecondaryActions = () => {
    const actions = [];

    if (issue.status !== 'resolved') {
      actions.push({
        label: 'Resolve',
        icon: IconCheck,
        action: () => handleStatusChange('resolved')
      });
    }

    if (issue.status !== 'ignored') {
      actions.push({
        label: 'Ignore',
        icon: IconEyeOff,
        action: () => handleStatusChange('ignored')
      });
    }

    if (issue.status !== 'unresolved') {
      actions.push({
        label: 'Unresolve',
        icon: IconAlertTriangle,
        action: () => handleStatusChange('unresolved')
      });
    }

    return actions;
  };

  const mainAction = getMainAction();
  const secondaryActions = getSecondaryActions();

  return (
    <Group gap="xs">
      <Button
        leftSection={<mainAction.icon size={16} />}
        color={mainAction.color}
        onClick={mainAction.action}
        loading={isPending}
      >
        {mainAction.label}
      </Button>

      {secondaryActions.length > 1 && (
        <Menu shadow="md" width={160}>
          <Menu.Target>
            <Button
              variant="light"
              rightSection={<IconChevronDown size={16} />}
              disabled={isPending}
            >
              More
            </Button>
          </Menu.Target>
          <Menu.Dropdown>
            {secondaryActions.map((action) => (
              <Menu.Item
                key={action.label}
                leftSection={<action.icon size={16} />}
                onClick={action.action}
              >
                {action.label}
              </Menu.Item>
            ))}
          </Menu.Dropdown>
        </Menu>
      )}
    </Group>
  );
}
