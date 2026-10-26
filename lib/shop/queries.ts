import 'server-only'

import { createClient } from '@/lib/supabase/server'
import type { Cosmetic } from '@/lib/types'

export interface CosmeticWithOwnership extends Cosmetic {
  owned: boolean
  equipped: boolean
}

/**
 * Load active cosmetics plus ownership/equip state for the current user.
 * Assumes the caller has already established the session.
 */
export async function getCosmeticsWithOwnership(
  userId: string,
  equippedCosmeticId: string | null
): Promise<CosmeticWithOwnership[]> {
  const supabase = createClient()

  const [{ data: cosmetics, error: cosmeticsError }, { data: owned, error: ownedError }] =
    await Promise.all([
      supabase.from('cosmetics').select('*').eq('is_active', true).order('price'),
      supabase.from('user_cosmetics').select('cosmetic_id').eq('user_id', userId),
    ])

  if (cosmeticsError) throw new Error(cosmeticsError.message)
  if (ownedError) throw new Error(ownedError.message)

  const ownedSet = new Set((owned ?? []).map((o) => o.cosmetic_id as string))

  return (cosmetics ?? []).map((c) => ({
    ...(c as Cosmetic),
    owned: ownedSet.has(c.id),
    equipped: equippedCosmeticId === c.id,
  }))
}