import { requireSession } from '@/lib/auth/session'
import { AutoSync } from '@/components/auto-sync'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Keep the authenticated shell protected even if a page forgets to check.
  await requireSession()

  return (
    <>
      <AutoSync />
      {children}
    </>
  )
}
