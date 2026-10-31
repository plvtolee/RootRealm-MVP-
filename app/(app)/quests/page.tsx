import { requireSession } from '@/lib/auth/session'
import { signInWithGitHub, signOut } from '@/lib/auth/actions'
import { getGitHubConnectionStatus, getQuestsWithStatus } from '@/lib/quests/queries'
import { toPhase2Chrome, toPhase2Quests } from '@/lib/phase2/adapters'
import { Phase2View } from '@/components/phase2/phase2-view'

export default async function QuestsPage() {
  const { profile } = await requireSession()
  const [quests, connection] = await Promise.all([
    getQuestsWithStatus(profile.id),
    getGitHubConnectionStatus(profile.id),
  ])

  return (
    <Phase2View
      section="quests"
      chrome={toPhase2Chrome(profile)}
      quests={toPhase2Quests(quests)}
      connection={{
        lastSyncedAt: connection?.last_synced_at ?? null,
        needsReauth: !connection || connection.needs_reauth,
      }}
      connectAction={signInWithGitHub}
      signOutAction={signOut}
    />
  )
}
