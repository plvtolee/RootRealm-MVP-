'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log to the server/monitoring boundary; avoid exposing internals to the UI.
    console.error(error)
  }, [error])

  return (
    <div className="flex flex-col items-center gap-4 rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center">
      <h2 className="text-lg font-semibold">Something went wrong</h2>
      <p className="text-sm text-muted-foreground">
        We could not load this section. Please try again.
      </p>
      <Button onClick={reset}>Try again</Button>
    </div>
  )
}