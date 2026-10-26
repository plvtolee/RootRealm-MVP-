'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { purchaseCosmetic, equipCosmetic } from '@/lib/shop/actions'
import type { CosmeticWithOwnership } from '@/lib/shop/queries'
import { AvatarWithBorder } from '@/components/avatar-with-border'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/cn'

interface ShopListProps {
  cosmetics: CosmeticWithOwnership[]
  username: string
  avatarUrl: string | null
  coins: number
}

type Feedback = { type: 'success' | 'error'; message: string } | null

export function ShopList({ cosmetics, username, avatarUrl, coins }: ShopListProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<Feedback>(null)
  const [pendingId, setPendingId] = useState<string | null>(null)

  function run(id: string, action: () => Promise<{ ok: boolean; message: string }>) {
    setFeedback(null)
    setPendingId(id)
    startTransition(async () => {
      const result = await action()
      setPendingId(null)
      setFeedback({ type: result.ok ? 'success' : 'error', message: result.message })
      if (result.ok) router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-4">
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

      {cosmetics.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          No cosmetics are available right now.
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {cosmetics.map((item) => {
            const busy = isPending && pendingId === item.id
            const affordable = coins >= item.price
            return (
              <li
                key={item.id}
                className="flex flex-col gap-4 rounded-lg border border-border bg-card p-5 shadow-sm"
              >
                <div className="flex items-center gap-4">
                  <AvatarWithBorder
                    avatarUrl={avatarUrl}
                    username={username}
                    borderPreview={item.preview_value}
                    size="md"
                  />
                  <div className="min-w-0">
                    <p className="font-semibold">{item.name}</p>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-medium">{item.price} coins</span>
                  <div className="flex items-center gap-2">
                    {item.owned ? (
                      item.equipped ? (
                        <>
                          <span className="text-xs font-medium text-emerald-700">Equipped</span>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busy}
                            onClick={() => run(item.id, () => equipCosmetic(null))}
                          >
                            {busy ? 'Updating…' : 'Unequip'}
                          </Button>
                        </>
                      ) : (
                        <>
                          <span className="text-xs font-medium text-muted-foreground">Owned</span>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busy}
                            onClick={() => run(item.id, () => equipCosmetic(item.id))}
                          >
                            {busy ? 'Updating…' : 'Equip'}
                          </Button>
                        </>
                      )
                    ) : (
                      <Button
                        size="sm"
                        disabled={busy || !affordable}
                        aria-disabled={!affordable}
                        onClick={() => run(item.id, () => purchaseCosmetic(item.id))}
                      >
                        {busy ? 'Purchasing…' : affordable ? 'Purchase' : 'Not enough coins'}
                      </Button>
                    )}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}