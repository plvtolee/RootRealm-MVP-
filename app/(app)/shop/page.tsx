import { requireSession } from '@/lib/auth/session'
import { signInWithGitHub, signOut } from '@/lib/auth/actions'
import { getCosmeticsWithOwnership } from '@/lib/shop/queries'
import { toPhase2Chrome, toPhase2Cosmetics } from '@/lib/phase2/adapters'
import { Phase2View } from '@/components/phase2/phase2-view'

export default async function ShopPage() {
  const { profile } = await requireSession()
  const cosmetics = await getCosmeticsWithOwnership(
    profile.id,
    profile.equipped_cosmetic_id
  )

  return (
    <Phase2View
      section="shop"
      chrome={toPhase2Chrome(profile)}
      cosmetics={toPhase2Cosmetics(cosmetics)}
      connectAction={signInWithGitHub}
      signOutAction={signOut}
    />
  )
}
