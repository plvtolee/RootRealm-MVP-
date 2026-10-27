import { requireSession } from '@/lib/auth/session'
import { getGitHubConnectionStatus, getQuestsWithStatus } from '@/lib/quests/queries'
import { QuestList } from '@/components/quest-list'

export default async function QuestsPage() {
  const { profile } = await requireSession()
  const [quests, connection] = await Promise.all([
    getQuestsWithStatus(profile.id),
    getGitHubConnectionStatus(profile.id),
  ])

  const completedCount = quests.filter((quest) => quest.completed).length

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Quests</h1>
          <p className="text-sm text-muted-foreground">
            Milestones advance from your public GitHub commits and merged pull requests.
          </p>
        </div>
        <span className="text-sm text-muted-foreground">
          {completedCount} / {quests.length} completed
        </span>
      </div>

      <QuestList
        quests={quests}
        lastSyncedAt={connection?.last_synced_at ?? null}
        needsReauth={!connection || connection.needs_reauth}
      />
    </div>
  )
}
