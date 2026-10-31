import 'server-only'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { rarityOrder } from '@/lib/cosmetics/rarity'
import type { Cosmetic } from '@/lib/types'

export interface CosmeticWithOwnership extends Cosmetic {
  owned: boolean
  equipped: boolean
}

export interface CosmeticsQueryOptions {
  /** True when the signed-in user is the configured rootrealm creator. */
  isCreator?: boolean
}

/**
 * Load active cosmetics plus ownership/equip state for the current user.
 * Assumes the caller has already established the session.
 *
 * Creator Exclusive items are granted to the creator out-of-band (they are never
 * purchasable). The grant is persisted through the service-role client so the
 * existing `equip_cosmetic` ownership check keeps working unchanged.
 */
export async function getCosmeticsWithOwnership(
  userId: string,
  equippedCosmeticId: string | null,
  options: CosmeticsQueryOptions = {}
): Promise<CosmeticWithOwnership[]> {
  const supabase = createClient()

  const [{ data: cosmetics, error: cosmeticsError }, { data: owned, error: ownedError }] =
    await Promise.all([
      supabase.from('cosmetics').select('*').eq('is_active', true),
      supabase.from('user_cosmetics').select('cosmetic_id').eq('user_id', userId),
    ])

  if (cosmeticsError) throw new Error(cosmeticsError.message)
  if (ownedError) throw new Error(ownedError.message)

  const rows = (cosmetics ?? []) as Cosmetic[]
  const ownedSet = new Set((owned ?? []).map((o) => o.cosmetic_id as string))

  if (options.isCreator) {
    const exclusive = rows.filter((cosmetic) => cosmetic.is_exclusive)
    if (exclusive.length > 0) {
      const admin = createAdminClient()
      const { error } = await admin.from('user_cosmetics').upsert(
        exclusive.map((cosmetic) => ({ user_id: userId, cosmetic_id: cosmetic.id })),
        { onConflict: 'user_id,cosmetic_id', ignoreDuplicates: true }
      )
      if (error) throw new Error(error.message)
      for (const cosmetic of exclusive) ownedSet.add(cosmetic.id)
    }
  }

  return rows
    .map((cosmetic) => ({
      ...cosmetic,
      owned: ownedSet.has(cosmetic.id),
      equipped: equippedCosmeticId === cosmetic.id,
    }))
    .sort(
      (a, b) =>
        rarityOrder(a.rarity) - rarityOrder(b.rarity) ||
        a.price - b.price ||
        a.name.localeCompare(b.name)
    )
}