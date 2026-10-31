import { requireSession } from '@/lib/auth/session'
import { signInWithGitHub, signOut } from '@/lib/auth/actions'
import { getCosmeticsWithOwnership } from '@/lib/shop/queries'
import { toPhase2Chrome, toPhase2Cosmetics } from '@/lib/phase2/adapters'
import { isCreatorProfile } from '@/lib/cosmetics/creator'
import { Phase2View } from '@/components/phase2/phase2-view'

export default async function ShopPage() {
  const { profile } = await requireSession()
  const isCreator = isCreatorProfile(profile)
  const cosmetics = await getCosmeticsWithOwnership(
    profile.id,
    profile.equipped_cosmetic_id,
    { isCreator }
  )

  return (
    <Phase2View
      section="shop"
      chrome={toPhase2Chrome(profile)}
      cosmetics={toPhase2Cosmetics(cosmetics)}
      isCreator={isCreator}
      connectAction={signInWithGitHub}
      signOutAction={signOut}
    />
  )
}
