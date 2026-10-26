import { requireSession } from '@/lib/auth/session'
import { getCosmeticsWithOwnership } from '@/lib/shop/queries'
import { ShopList } from '@/components/shop-list'

export default async function ShopPage() {
  const { profile } = await requireSession()
  const cosmetics = await getCosmeticsWithOwnership(
    profile.id,
    profile.equipped_cosmetic_id
  )

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold tracking-tight">Shop</h1>
        <span className="rounded-full border border-border px-3 py-1 text-sm font-medium">
          {profile.coins.toLocaleString()} coins
        </span>
      </div>

      <ShopList
        cosmetics={cosmetics}
        username={profile.username}
        avatarUrl={profile.avatar_url}
        coins={profile.coins}
      />
    </div>
  )
}