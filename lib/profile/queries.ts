import 'server-only'

import { createClient } from '@/lib/supabase/server'
import { getProgression } from '@/lib/progression'
import type { Cosmetic, Profile } from '@/lib/types'

export interface ProfileOverview {
  profile: Profile
  equipped: Cosmetic | null
  questsCompleted: number
  progression: ReturnType<typeof getProgression>
}

/**
 * Load the data needed by the Profile section for one user.
 */
export async function getProfileOverview(profile: Profile): Promise<ProfileOverview> {
  const supabase = createClient()

  const [{ data: equipped }, { count }] = await Promise.all([
    profile.equipped_cosmetic_id
      ? supabase
          .from('cosmetics')
          .select('*')
          .eq('id', profile.equipped_cosmetic_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from('quest_completions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', profile.id),
  ])

  return {
    profile,
    equipped: (equipped as Cosmetic | null) ?? null,
    questsCompleted: count ?? 0,
    progression: getProgression(profile.total_xp),
  }
}