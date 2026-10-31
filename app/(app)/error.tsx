'use client'

import { useEffect } from 'react'

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
    <div className="flex min-h-screen items-center justify-center bg-[#0b0d11] px-4 py-16 text-[#eef0f4]">
      <div className="w-full max-w-md border border-[#d18a71]/40 bg-[#14171d] p-8 text-center">
        <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#d18a71]">
          Realm error
        </div>
        <h2 className="mt-3 text-xl font-semibold">Something went wrong</h2>
        <p className="mt-2 text-sm text-[#a0a7b3]">
          We could not load this section. Please try again.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 inline-flex min-h-[38px] items-center justify-center border border-[#d4d9e2] bg-[#d4d9e2] px-4 text-[11px] font-bold text-[#262b34] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#d4d9e2]"
        >
          Try again
        </button>
      </div>
    </div>
  )
}
