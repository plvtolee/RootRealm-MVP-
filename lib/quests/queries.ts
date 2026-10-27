import 'server-only';

import { createClient } from '@/lib/supabase/server';
import type {
  GitHubConnection,
  Quest,
  QuestProgress,
  QuestProgressStatus,
} from '@/lib/types';
import { describeQuestRule } from './rules';

export interface QuestWithStatus extends Quest {
  completed: boolean;
  completedAt: string | null;
  progress: number;
  target: number;
  status: QuestProgressStatus;
  ruleLabel: string;
}

function targetFor(quest: Quest): number {
  return quest.requirement_count ?? 0;
}

/**
 * Load active quests with the user's persisted progress and completion state.
 * Assumes the caller has already established the session.
 */
export async function getQuestsWithStatus(userId: string): Promise<QuestWithStatus[]> {
  const supabase = createClient();

  const [questsResponse, completionsResponse, progressResponse] = await Promise.all([
    supabase
      .from('quests')
      .select('*')
      .eq('is_active', true)
      .order('difficulty')
      .order('title'),
    supabase
      .from('quest_completions')
      .select('quest_id, completed_at')
      .eq('user_id', userId),
    supabase.from('quest_progress').select('*').eq('user_id', userId),
  ]);

  if (questsResponse.error) throw new Error(questsResponse.error.message);
  if (completionsResponse.error) throw new Error(completionsResponse.error.message);
  if (progressResponse.error) throw new Error(progressResponse.error.message);

  const completedMap = new Map<string, string | null>();
  for (const completion of completionsResponse.data ?? []) {
    completedMap.set(completion.quest_id as string, completion.completed_at as string);
  }

  const progressMap = new Map<string, QuestProgress>();
  for (const row of (progressResponse.data ?? []) as QuestProgress[]) {
    progressMap.set(row.quest_id, row);
  }

  return ((questsResponse.data ?? []) as Quest[]).map((quest) => {
    const progressRow = progressMap.get(quest.id);
    const completed = completedMap.has(quest.id) || progressRow?.status === 'completed';
    const status: QuestProgressStatus = completed
      ? 'completed'
      : progressRow?.status ?? 'in_progress';

    return {
      ...quest,
      completed,
      completedAt: completedMap.get(quest.id) ?? null,
      progress: progressRow?.progress ?? (completed ? targetFor(quest) : 0),
      target: progressRow?.target ?? targetFor(quest),
      status,
      ruleLabel: describeQuestRule(quest),
    };
  });
}

export type GitHubConnectionStatus = Pick<
  GitHubConnection,
  | 'last_synced_at'
  | 'needs_reauth'
  | 'initial_sync_completed_at'
  | 'commits_history_complete'
  | 'prs_history_complete'
>;

/** Non-secret connection state for the Quests/Profile UI. */
export async function getGitHubConnectionStatus(
  userId: string
): Promise<GitHubConnectionStatus | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('github_connections')
    .select(
      'last_synced_at, needs_reauth, initial_sync_completed_at, commits_history_complete, prs_history_complete'
    )
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    return null;
  }

  return (data as GitHubConnectionStatus | null) ?? null;
}
