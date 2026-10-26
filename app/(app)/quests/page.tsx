import { requireSession } from '@/lib/auth/session'
import { getQuestsWithStatus } from '@/lib/quests/queries'
import { QuestList } from '@/components/quest-list'

export default async function QuestsPage() {
  const { profile } = await requireSession()
  const quests = await getQuestsWithStatus(profile.id)

  const completedCount = quests.filter((q) => q.completed).length

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold tracking-tight">Quests</h1>
        <span className="text-sm text-muted-foreground">
          {completedCount} / {quests.length} completed
        </span>
      </div>

      <QuestList quests={quests} />
    </div>
  )
}