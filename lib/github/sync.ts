import 'server-only';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { EvaluateQuestRow, GitHubConnection, QuestProgressStatus } from '@/lib/types';
import { searchCommits, searchMergedPullRequests } from './client';
import { GitHubApiError, toGitHubApiError } from './errors';
import {
  loadDecryptedToken,
  loadGitHubConnection,
  markNeedsReauth,
} from './token-store';
import type { ActivityEvent, GitHubRateLimit, SearchResult } from './types';

const OVERLAP_MS = 24 * 60 * 60 * 1000;

export interface QuestProgressSummary {
  questId: string;
  title: string;
  progress: number;
  target: number;
  status: QuestProgressStatus;
  newlyCompleted: boolean;
  xpAwarded: number;
  coinsAwarded: number;
}

export interface SyncSummary {
  outcome: 'success' | 'partial' | 'rate_limited' | 'failed';
  eventsFound: number;
  eventsInserted: number;
  commitsFound: number;
  prsFound: number;
  questsCompleted: QuestProgressSummary[];
  progress: QuestProgressSummary[];
  truncated: boolean;
  rateLimitResetAt: string | null;
  newTotalXp: number | null;
  newCoins: number | null;
}

export interface SyncResult {
  ok: boolean;
  reason?: 'needs_reauth' | 'rate_limited' | 'error';
  message: string;
  summary?: SyncSummary;
}

function pickRateLimit(
  first?: GitHubRateLimit,
  second?: GitHubRateLimit
): GitHubRateLimit {
  const candidates = [first, second].filter(Boolean) as GitHubRateLimit[];
  if (candidates.length === 0) {
    return { remaining: null, resetAt: null };
  }

  let best = candidates[0];
  for (const candidate of candidates.slice(1)) {
    if (candidate.remaining === null) continue;
    if (best.remaining === null || candidate.remaining < best.remaining) {
      best = candidate;
    }
  }
  return best;
}

function asNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && Number.isFinite(Number(value))) return Number(value);
  return 0;
}

/**
 * User-triggered GitHub activity sync.
 *
 * The caller must have already verified the session. `userId` is derived
 * server-side from that session and is never supplied by the browser.
 *
 * The encrypted token is read with the service role; all game-state writes
 * happen through `record_activity_events` and `evaluate_activity_quests`,
 * which derive the user from `auth.uid()` and are SQL-authoritative.
 */
export async function syncUserActivity(userId: string): Promise<SyncResult> {
  const startedAt = new Date();
  const admin = createAdminClient();

  let connection: GitHubConnection | null;
  try {
    connection = await loadGitHubConnection(userId);
  } catch {
    return { ok: false, reason: 'error', message: 'Could not load your GitHub connection.' };
  }

  if (!connection || connection.needs_reauth) {
    return {
      ok: false,
      reason: 'needs_reauth',
      message: 'Please sign in with GitHub again to enable activity sync.',
    };
  }

  let token: string | null;
  try {
    token = await loadDecryptedToken(userId);
  } catch {
    await markNeedsReauth(userId);
    return {
      ok: false,
      reason: 'needs_reauth',
      message: 'Your GitHub connection needs to be refreshed. Please sign in again.',
    };
  }

  if (!token) {
    await markNeedsReauth(userId);
    return {
      ok: false,
      reason: 'needs_reauth',
      message: 'No GitHub token is available. Please sign in again.',
    };
  }

  const since = connection.last_synced_at
    ? new Date(new Date(connection.last_synced_at).getTime() - OVERLAP_MS)
    : null;

  let commitsResult: SearchResult | null = null;
  let prsResult: SearchResult | null = null;
  let failure: GitHubApiError | null = null;

  try {
    commitsResult = await searchCommits(token, connection.github_login, { since });
  } catch (error) {
    failure = toGitHubApiError(error);
  }

  const canFetchPrs =
    !failure || (failure.code !== 'rate_limited' && failure.code !== 'unauthorized');

  if (canFetchPrs) {
    try {
      prsResult = await searchMergedPullRequests(token, connection.github_login, { since });
    } catch (error) {
      failure = failure ?? toGitHubApiError(error);
    }
  }

  if (failure?.code === 'unauthorized') {
    await markNeedsReauth(userId);
  }

  const events: ActivityEvent[] = [
    ...(commitsResult?.events ?? []),
    ...(prsResult?.events ?? []),
  ];

  const commitsTruncated = commitsResult?.truncated ?? false;
  const prsTruncated = prsResult?.truncated ?? false;
  const truncated = commitsTruncated || prsTruncated;
  const rateLimit = pickRateLimit(commitsResult?.rateLimit, prsResult?.rateLimit);

  // Record + evaluate through the user's session so auth.uid() is set.
  const userClient = createClient();
  let inserted = 0;
  let rpcFailure: string | null = null;
  let evalRows: EvaluateQuestRow[] = [];

  if (events.length > 0) {
    const { data, error } = await userClient.rpc('record_activity_events', {
      p_events: events,
    });
    if (error) {
      rpcFailure = error.message;
    } else {
      inserted = asNumber(data);
    }
  }

  if (!rpcFailure) {
    const { data, error } = await userClient.rpc('evaluate_activity_quests');
    if (error) {
      rpcFailure = error.message;
    } else {
      evalRows = (data as EvaluateQuestRow[] | null) ?? [];
    }
  }

  let outcome: SyncSummary['outcome'];
  if (failure) {
    if (failure.code === 'rate_limited') {
      outcome = 'rate_limited';
    } else if (commitsResult || prsResult) {
      outcome = 'partial';
    } else {
      outcome = 'failed';
    }
  } else if (rpcFailure) {
    outcome = 'failed';
  } else {
    outcome = 'success';
  }

  const questIds = evalRows.map((row) => row.out_quest_id);
  const titles = new Map<string, string>();
  if (questIds.length > 0) {
    const { data: quests } = await userClient
      .from('quests')
      .select('id, title')
      .in('id', questIds);
    for (const quest of quests ?? []) {
      titles.set(quest.id as string, quest.title as string);
    }
  }

  const progress: QuestProgressSummary[] = evalRows.map((row) => ({
    questId: row.out_quest_id,
    title: titles.get(row.out_quest_id) ?? 'Quest',
    progress: row.out_progress,
    target: row.out_target,
    status: row.out_status,
    newlyCompleted: row.out_newly_completed,
    xpAwarded: row.out_xp_awarded,
    coinsAwarded: row.out_coins_awarded,
  }));
  const questsCompleted = progress.filter((row) => row.newlyCompleted);

  let newTotalXp: number | null = null;
  let newCoins: number | null = null;
  const { data: profile } = await userClient
    .from('profiles')
    .select('total_xp, coins')
    .eq('id', userId)
    .maybeSingle();
  if (profile) {
    newTotalXp = profile.total_xp as number;
    newCoins = profile.coins as number;
  }

  const isInitial = !connection.initial_sync_completed_at;
  const syncSucceeded = outcome === 'success';

  const commitsComplete = commitsResult
    ? isInitial
      ? !commitsTruncated
      : connection.commits_history_complete && !commitsTruncated
    : connection.commits_history_complete;

  const prsComplete = prsResult
    ? isInitial
      ? !prsTruncated
      : connection.prs_history_complete && !prsTruncated
    : connection.prs_history_complete;

  const updates: Record<string, unknown> = {
    commits_history_complete: commitsComplete,
    prs_history_complete: prsComplete,
    needs_reauth: failure?.code === 'unauthorized',
  };

  if (syncSucceeded) {
    const nowIso = new Date().toISOString();
    updates.last_synced_at = nowIso;
    if (isInitial) {
      updates.initial_sync_completed_at = nowIso;
    }
  }

  await admin.from('github_connections').update(updates).eq('user_id', userId);

  await admin.from('github_sync_runs').insert({
    user_id: userId,
    status: outcome,
    started_at: startedAt.toISOString(),
    finished_at: new Date().toISOString(),
    commits_found: commitsResult?.events.length ?? 0,
    prs_found: prsResult?.events.length ?? 0,
    events_inserted: inserted,
    quests_completed: questsCompleted.length,
    truncated,
    error_message: failure?.message ?? rpcFailure,
    rate_limit_remaining: rateLimit.remaining,
    rate_limit_reset_at: rateLimit.resetAt?.toISOString() ?? null,
  });

  const summary: SyncSummary = {
    outcome,
    eventsFound: events.length,
    eventsInserted: inserted,
    commitsFound: commitsResult?.events.length ?? 0,
    prsFound: prsResult?.events.length ?? 0,
    questsCompleted,
    progress,
    truncated,
    rateLimitResetAt: rateLimit.resetAt?.toISOString() ?? null,
    newTotalXp,
    newCoins,
  };

  if (failure?.code === 'rate_limited') {
    return {
      ok: false,
      reason: 'rate_limited',
      message: 'GitHub rate limit reached.',
      summary,
    };
  }

  if (failure?.code === 'unauthorized') {
    return {
      ok: false,
      reason: 'needs_reauth',
      message: 'Your GitHub token was revoked. Please sign in again.',
      summary,
    };
  }

  if (rpcFailure) {
    return {
      ok: false,
      reason: 'error',
      message: 'Activity was retrieved, but progress could not be saved. Please try again.',
      summary,
    };
  }

  if (failure && !commitsResult && !prsResult) {
    return {
      ok: false,
      reason: 'error',
      message: 'GitHub sync failed. Please try again.',
      summary,
    };
  }

  return { ok: true, message: 'Sync complete.', summary };
}
