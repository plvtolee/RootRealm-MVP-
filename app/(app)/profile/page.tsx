import { requireSession } from '@/lib/auth/session'
import { signInWithGitHub, signOut } from '@/lib/auth/actions'
import { getProfileActivityStats, getProfileOverview } from '@/lib/profile/queries'
import { getQuestsWithStatus } from '@/lib/quests/queries'
import { toPhase2Chrome, toPhase2Profile } from '@/lib/phase2/adapters'
import { Phase2View } from '@/components/phase2/phase2-view'

export default async function ProfilePage() {
  const { profile } = await requireSession()
  const [overview, quests, activityStats] = await Promise.all([
    getProfileOverview(profile),
    getQuestsWithStatus(profile.id),
    getProfileActivityStats(profile.id),
  ])

  return (
    <Phase2View
      section="profile"
      chrome={toPhase2Chrome(profile)}
      profile={toPhase2Profile(overview, quests, activityStats)}
      connection={{
        lastSyncedAt: overview.github?.last_synced_at ?? null,
        needsReauth: !overview.github || overview.github.needs_reauth,
      }}
      connectAction={signInWithGitHub}
      signOutAction={signOut}
    />
  )
}
