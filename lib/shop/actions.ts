'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireSession } from '@/lib/auth/session'
import type { PurchaseCosmeticResult } from '@/lib/types'

export interface ShopActionState {
  ok: boolean
  message: string
  result?: PurchaseCosmeticResult
}

/**
 * Purchase a cosmetic for the authenticated user.
 *
 * The database function validates the price, checks the balance, deducts
 * coins, and inserts ownership atomically. The user id is derived from the
 * session; the client only supplies the cosmetic id.
 */
export async function purchaseCosmetic(cosmeticId: string): Promise<ShopActionState> {
  if (typeof cosmeticId !== 'string' || cosmeticId.length === 0) {
    return { ok: false, message: 'Invalid cosmetic.' }
  }

  await requireSession()

  const supabase = createClient()
  const { data, error } = await supabase.rpc('purchase_cosmetic', {
    p_cosmetic_id: cosmeticId,
  })

  if (error) {
    return { ok: false, message: mapPurchaseError(error.message, error.code) }
  }

  const row = Array.isArray(data) ? data[0] : data
  if (!row) {
    return { ok: false, message: 'Could not complete the purchase. Please try again.' }
  }

  revalidatePath('/shop')
  revalidatePath('/profile')

  return { ok: true, message: 'Purchase complete!', result: row as PurchaseCosmeticResult }
}

/**
 * Equip an owned cosmetic, or pass null to unequip.
 */
export async function equipCosmetic(cosmeticId: string | null): Promise<ShopActionState> {
  if (cosmeticId !== null && (typeof cosmeticId !== 'string' || cosmeticId.length === 0)) {
    return { ok: false, message: 'Invalid cosmetic.' }
  }

  await requireSession()

  const supabase = createClient()
  const { error } = await supabase.rpc('equip_cosmetic', {
    p_cosmetic_id: cosmeticId,
  })

  if (error) {
    return { ok: false, message: mapEquipError(error.message, error.code) }
  }

  revalidatePath('/shop')
  revalidatePath('/profile')

  return {
    ok: true,
    message: cosmeticId ? 'Border equipped!' : 'Border removed.',
  }
}

function mapPurchaseError(message: string, code?: string): string {
  if (message.includes('Insufficient coins')) {
    return 'You do not have enough coins for this item.'
  }
  if (code === '23505' || message.includes('already owned')) {
    return 'You already own this item.'
  }
  if (message.includes('not found or inactive')) {
    return 'This item is no longer available.'
  }
  if (code === '28000' || message.includes('authenticated')) {
    return 'Please sign in to purchase items.'
  }
  return 'Could not complete the purchase. Please try again.'
}

function mapEquipError(message: string, code?: string): string {
  if (message.includes('not owned')) {
    return 'You do not own this item.'
  }
  if (code === '28000' || message.includes('authenticated')) {
    return 'Please sign in to manage cosmetics.'
  }
  return 'Could not update your border. Please try again.'
}