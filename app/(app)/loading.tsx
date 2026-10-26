'use client'

export default function Loading() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-label="Loading">
      <div className="h-8 w-32 animate-pulse rounded-md bg-secondary" />
      <div className="h-40 w-full animate-pulse rounded-lg bg-secondary" />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="h-28 animate-pulse rounded-lg bg-secondary" />
        <div className="h-28 animate-pulse rounded-lg bg-secondary" />
      </div>
    </div>
  )
}