import 'server-only'

import { createClient } from '@/lib/supabase/server'
import type { Quest } from '@/lib/types'

export interface QuestWithStatus extends Quest {
  completed: boolean
  completedAt: string | null
}

/**
 * Load all active quests plus the current user's completion status.
 * Assumes the caller has already established the session.
 */
export async function getQuestsWithStatus(userId: string): Promise<QuestWithStatus[]> {
  const supabase = createClient()

  const [{ data: quests, error: questsError }, { data: completions, error: completionsError }] =
    await Promise.all([
      supabase.from('quests').select('*').eq('is_active', true).order('difficulty').order('title'),
      supabase
        .from('quest_completions')
        .select('quest_id, completed_at')
        .eq('user_id', userId),
    ])

  if (questsError) throw new Error(questsError.message)
  if (completionsError) throw new Error(completionsError.message)

  const completedMap = new Map<string, string | null>()
  for (const c of completions ?? []) {
    completedMap.set(c.quest_id as string, c.completed_at as string)
  }

  return (quests ?? []).map((q) => ({
    ...(q as Quest),
    completed: completedMap.has(q.id),
    completedAt: completedMap.get(q.id) ?? null,
  }))
}