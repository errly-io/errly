'use server';

import { revalidatePath } from 'next/cache';
import { issuesRepository } from '@/lib/repositories/clickhouse/issues';
import { invalidateIssuesCache } from '@/lib/data/issues';

export type ActionResult<T = any> = {
  success: boolean;
  data?: T;
  error?: string;
};

export async function updateIssueStatus(
  issueId: string,
  status: 'resolved' | 'ignored' | 'unresolved',
  projectId?: string
): Promise<ActionResult> {
  try {
    const success = await issuesRepository.updateIssueStatus(issueId, status);
    
    if (!success) {
      return {
        success: false,
        error: 'Failed to update issue status'
      };
    }

    // Invalidate cache
    await invalidateIssuesCache(projectId, issueId);

    // Update pages
    revalidatePath('/[space]/issues', 'page');
    revalidatePath('/[space]/issues/[id]', 'page');
    revalidatePath('/[space]/projects/[id]', 'page');

    return {
      success: true,
      data: { issueId, status }
    };
  } catch (error) {
    console.error('Error updating issue status:', error);
    return {
      success: false,
      error: 'Failed to update issue status. Please try again.'
    };
  }
}

export async function resolveIssue(issueId: string, projectId?: string): Promise<ActionResult> {
  return updateIssueStatus(issueId, 'resolved', projectId);
}

export async function ignoreIssue(issueId: string, projectId?: string): Promise<ActionResult> {
  return updateIssueStatus(issueId, 'ignored', projectId);
}

export async function unresolveIssue(issueId: string, projectId?: string): Promise<ActionResult> {
  return updateIssueStatus(issueId, 'unresolved', projectId);
}

export async function bulkUpdateIssues(
  issueIds: string[],
  status: 'resolved' | 'ignored' | 'unresolved',
  projectId?: string
): Promise<ActionResult> {
  try {
    const results = await Promise.allSettled(
      issueIds.map(issueId => issuesRepository.updateIssueStatus(issueId, status))
    );

    const successful = results.filter(result => result.status === 'fulfilled' && result.value).length;
    const failed = results.length - successful;

    if (failed > 0) {
      console.warn(`Bulk update: ${successful} successful, ${failed} failed`);
    }

    // Invalidate cache
    await invalidateIssuesCache(projectId);

    // Update pages
    revalidatePath('/[space]/issues', 'page');
    revalidatePath('/[space]/projects/[id]', 'page');

    return {
      success: true,
      data: { 
        successful, 
        failed, 
        total: results.length,
        status 
      }
    };
  } catch (error) {
    console.error('Error bulk updating issues:', error);
    return {
      success: false,
      error: 'Failed to update issues. Please try again.'
    };
  }
}
