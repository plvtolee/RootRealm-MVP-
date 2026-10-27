'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { syncGithubActivity } from '@/lib/quests/actions';
import { signInWithGitHub } from '@/lib/auth/actions';
import type { QuestWithStatus } from '@/lib/quests/queries';
import { DifficultyBadge } from '@/components/difficulty-badge';
import { LocalTime } from '@/components/local-time';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';

type Feedback = {
  type: 'success' | 'error';
  message: string;
  resetAt?: string | null;
} | null;

const groups: Array<{ key: QuestWithStatus['difficulty']; title: string }> = [
  { key: 'easy', title: 'Easy' },
  { key: 'medium', title: 'Medium' },
  { key: 'hard', title: 'Hard' },
];

interface QuestListProps {
  quests: QuestWithStatus[];
  lastSyncedAt: string | null;
  needsReauth: boolean;
}

function StatusBadge({ status }: { status: QuestWithStatus['status'] }) {
  if (status === 'completed') {
    return (
      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
        Completed
      </span>
    );
  }
  if (status === 'indeterminate') {
    return (
      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
        History incomplete
      </span>
    );
  }
  return (
    <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground">
      In progress
    </span>
  );
}

export function QuestList({ quests, lastSyncedAt, needsReauth }: QuestListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<Feedback>(null);

  function handleSync() {
    setFeedback(null);
    startTransition(async () => {
      const result = await syncGithubActivity();

      if (result.ok) {
        const summary = result.summary;
        const parts: string[] = [];
        if (summary) {
          const count = summary.eventsInserted;
          parts.push(`${count} new event${count === 1 ? '' : 's'}`);
          if (summary.questsCompleted.length > 0) {
            parts.push(
              `completed ${summary.questsCompleted.map((quest) => quest.title).join(', ')}`
            );
          } else {
            parts.push('no new quest completions');
          }
          if (summary.truncated) {
            parts.push('history truncated at the GitHub search cap');
          }
        }
        setFeedback({
          type: 'success',
          message: `Sync complete — ${parts.join('; ')}.`,
        });
        router.refresh();
        return;
      }

      if (result.reason === 'rate_limited') {
        setFeedback({
          type: 'error',
          message: 'GitHub rate limit reached. Try again at ',
          resetAt: result.summary?.rateLimitResetAt ?? null,
        });
        router.refresh();
        return;
      }

      setFeedback({ type: 'error', message: result.message });
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3">
        <p className="text-sm text-muted-foreground">
          {lastSyncedAt ? (
            <>
              Last synced <LocalTime iso={lastSyncedAt} />
            </>
          ) : (
            'Not synced yet'
          )}
        </p>

        {needsReauth ? (
          <form action={signInWithGitHub}>
            <Button type="submit" size="sm">
              Reconnect GitHub
            </Button>
          </form>
        ) : (
          <Button size="sm" onClick={handleSync} disabled={isPending}>
            {isPending ? 'Syncing…' : 'Sync GitHub'}
          </Button>
        )}
      </div>

      {needsReauth && (
        <div
          role="alert"
          className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800"
        >
          Reconnect GitHub to sync your public activity. Private repository activity is not
          counted in this version.
        </div>
      )}

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
          {feedback.resetAt && (
            <>
              <LocalTime iso={feedback.resetAt} fallback="a later time" />.
            </>
          )}
        </div>
      )}

      {quests.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          No quests are available right now.
        </p>
      ) : (
        groups.map((group) => {
          const items = quests.filter((quest) => quest.difficulty === group.key);
          if (items.length === 0) return null;
          return (
            <section
              key={group.key}
              aria-labelledby={`group-${group.key}`}
              className="flex flex-col gap-3"
            >
              <h2
                id={`group-${group.key}`}
                className="text-sm font-semibold uppercase tracking-wide text-muted-foreground"
              >
                {group.title}
              </h2>
              <ul className="flex flex-col gap-3">
                {items.map((quest) => {
                  const percent =
                    quest.target > 0
                      ? Math.min(100, Math.round((quest.progress / quest.target) * 100))
                      : 0;

                  return (
                    <li
                      key={quest.id}
                      className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 shadow-sm"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold">{quest.title}</p>
                        <DifficultyBadge difficulty={quest.difficulty} />
                        <StatusBadge status={quest.status} />
                      </div>

                      <p className="text-sm text-muted-foreground">{quest.description}</p>
                      <p className="text-xs text-muted-foreground">{quest.ruleLabel}</p>

                      <div className="flex flex-col gap-1">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>
                            {quest.progress} / {quest.target}
                          </span>
                          <span className="font-medium text-foreground">
                            +{quest.xp_reward} XP · +{quest.coin_reward} coins
                          </span>
                        </div>
                        <div
                          className="h-2 w-full overflow-hidden rounded-full bg-secondary"
                          role="progressbar"
                          aria-valuenow={percent}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-label={`${quest.title} progress`}
                        >
                          <div
                            className={cn(
                              'h-full rounded-full transition-all',
                              quest.status === 'completed'
                                ? 'bg-emerald-500'
                                : quest.status === 'indeterminate'
                                  ? 'bg-amber-500'
                                  : 'bg-primary'
                            )}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>

                      {quest.status === 'indeterminate' && (
                        <p className="text-xs text-amber-700">
                          History was truncated at the GitHub search cap, so this milestone
                          cannot be confirmed yet.
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })
      )}
    </div>
  );
}
