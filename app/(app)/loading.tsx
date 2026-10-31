'use client'

export default function Loading() {
  return (
    <div
      className="min-h-screen bg-[#0b0d11] px-4 py-10"
      aria-busy="true"
      aria-label="Loading"
    >
      <div className="mx-auto flex w-full max-w-[1160px] flex-col gap-4">
        <div className="h-8 w-40 animate-pulse bg-[#1b1f26]" />
        <div className="h-40 w-full animate-pulse border border-[#20242c] bg-[#14171d]" />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="h-28 animate-pulse border border-[#20242c] bg-[#14171d]" />
          <div className="h-28 animate-pulse border border-[#20242c] bg-[#14171d]" />
        </div>
      </div>
    </div>
  )
}
