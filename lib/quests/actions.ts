'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireSession } from '@/lib/auth/session'
import type { CompleteQuestResult } from '@/lib/types'

export interface CompleteQuestState {
  ok: boolean
  message: string
  result?: CompleteQuestResult
}

/**
 * Complete a quest for the currently authenticated user.
 *
 * The user is derived from the verified session, never from client input.
 * Rewards come from the quest row inside the database function, so the
 * client cannot influence XP or coin amounts. The unique (user_id, quest_id)
 * constraint guarantees exactly-once awards under duplicate/concurrent calls.
 */
export async function completeQuest(questId: string): Promise<CompleteQuestState> {
  if (typeof questId !== 'string' || questId.length === 0) {
    return { ok: false, message: 'Invalid quest.' }
  }

  // Establishes the authenticated user; redirects if signed out.
  await requireSession()

  const supabase = createClient()
  const { data, error } = await supabase.rpc('complete_quest', {
    p_quest_id: questId,
  })

  if (error) {
    const message = mapQuestError(error.message, error.code)
    return { ok: false, message }
  }

  const row = Array.isArray(data) ? data[0] : data
  if (!row) {
    return { ok: false, message: 'Could not complete the quest. Please try again.' }
  }

  revalidatePath('/quests')
  revalidatePath('/profile')

  return { ok: true, message: 'Quest completed!', result: row as CompleteQuestResult }
}

function mapQuestError(message: string, code?: string): string {
  if (code === '23505' || message.includes('already completed')) {
    return 'You have already completed this quest.'
  }
  if (message.includes('not found or inactive')) {
    return 'This quest is not available.'
  }
  if (code === '28000' || message.includes('authenticated')) {
    return 'Please sign in to complete quests.'
  }
  return 'Could not complete the quest. Please try again.'
}