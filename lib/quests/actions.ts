'use server';

import { revalidatePath } from 'next/cache';
import { requireSession } from '@/lib/auth/session';
import { syncUserActivity, type SyncSummary } from '@/lib/github/sync';

export interface SyncActionOptions {
  /** Bypass the 10-minute auto-sync cooldown (manual button). */
  force?: boolean;
}

export interface SyncActionState {
  ok: boolean;
  reason?: 'needs_reauth' | 'rate_limited' | 'error';
  message: string;
  skipped?: boolean;
  summary?: SyncSummary;
}

/**
 * Synchronize the authenticated user's public GitHub activity and re-evaluate
 * activity-based quests.
 *
 * The user id comes from the verified session. The client sends no activity,
 * counts, or rewards. All evaluation and awards happen in SQL.
 */
export async function syncGithubActivity(
  options: SyncActionOptions = {}
): Promise<SyncActionState> {
  const { profile } = await requireSession();
  const result = await syncUserActivity(profile.id, { force: options.force });

  if (!result.skipped) {
    revalidatePath('/quests');
    revalidatePath('/profile');
  }

  return {
    ok: result.ok,
    reason: result.reason,
    message: result.message,
    skipped: result.skipped,
    summary: result.summary,
  };
}
