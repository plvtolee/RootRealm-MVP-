'use server';

import { revalidatePath } from 'next/cache';
import { requireSession } from '@/lib/auth/session';
import { syncUserActivity, type SyncSummary } from '@/lib/github/sync';

export interface SyncActionState {
  ok: boolean;
  reason?: 'needs_reauth' | 'rate_limited' | 'error';
  message: string;
  summary?: SyncSummary;
}

/**
 * Synchronize the authenticated user's public GitHub activity and re-evaluate
 * activity-based quests.
 *
 * The user id comes from the verified session. The client sends no activity,
 * counts, or rewards. All evaluation and awards happen in SQL.
 */
export async function syncGithubActivity(): Promise<SyncActionState> {
  const { profile } = await requireSession();
  const result = await syncUserActivity(profile.id);

  revalidatePath('/quests');
  revalidatePath('/profile');

  return {
    ok: result.ok,
    reason: result.reason,
    message: result.message,
    summary: result.summary,
  };
}
