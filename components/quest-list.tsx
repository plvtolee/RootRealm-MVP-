'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { completeQuest } from '@/lib/quests/actions'
import type { QuestWithStatus } from '@/lib/quests/queries'
import { DifficultyBadge } from '@/components/difficulty-badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/cn'

type Feedback = { type: 'success' | 'error'; message: string } | null

const groups: Array<{ key: QuestWithStatus['difficulty']; title: string }> = [
  { key: 'easy', title: 'Easy' },
  { key: 'medium', title: 'Medium' },
  { key: 'hard', title: 'Hard' },
]

export function QuestList({ quests }: { quests: QuestWithStatus[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<Feedback>(null)
  const [pendingId, setPendingId] = useState<string | null>(null)

  function handleComplete(questId: string) {
    setFeedback(null)
    setPendingId(questId)
    startTransition(async () => {
      const result = await completeQuest(questId)
      setPendingId(null)
      setFeedback({ type: result.ok ? 'success' : 'error', message: result.message })
      if (result.ok) router.refresh()
    })
  }

  if (quests.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        No quests are available right now.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {feedback && (
        <div
          role="status"
          aria-live="polite"
          className={cn(
            'rounded-md border px-3 py-2 text-sm',
            feedback.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-destructive/30 bg-destructive/10 text-destructive'
          )}
        >
          {feedback.message}
        </div>
      )}

      {groups.map((group) => {
        const items = quests.filter((q) => q.difficulty === group.key)
        if (items.length === 0) return null
        return (
          <section key={group.key} aria-labelledby={`group-${group.key}`} className="flex flex-col gap-3">
            <h2 id={`group-${group.key}`} className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {group.title}
            </h2>
            <ul className="flex flex-col gap-3">
              {items.map((quest) => {
                const busy = isPending && pendingId === quest.id
                return (
                  <li
                    key={quest.id}
                    className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold">{quest.title}</p>
                        <DifficultyBadge difficulty={quest.difficulty} />
                        {quest.completed && (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                            Completed
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{quest.description}</p>
                      <p className="mt-2 text-sm font-medium">
                        +{quest.xp_reward} XP · +{quest.coin_reward} coins
                      </p>
                    </div>

                    <div className="shrink-0">
                      {quest.completed ? (
                        <Button size="sm" variant="secondary" disabled aria-label={`${quest.title} already completed`}>
                          Completed
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          disabled={busy}
                          aria-label={`Complete quest: ${quest.title}`}
                          onClick={() => handleComplete(quest.id)}
                        >
                          {busy ? 'Completing…' : 'Complete'}
                        </Button>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          </section>
        )
      })}
    </div>
  )
}