import { requireSession } from '@/lib/auth/session'
import { signOut } from '@/lib/auth/actions'
import { NavBar } from '@/components/nav-bar'
import { AutoSync } from '@/components/auto-sync'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireSession()

  return (
    <div className="flex min-h-screen flex-col">
      <NavBar username={profile.username} signOutAction={signOut} />
      <AutoSync />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">{children}</main>
    </div>
  )
}