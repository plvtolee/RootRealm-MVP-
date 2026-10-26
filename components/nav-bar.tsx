'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/cn'

const links = [
  { href: '/profile', label: 'Profile' },
  { href: '/shop', label: 'Shop' },
  { href: '/quests', label: 'Quests' },
]

export function NavBar({ username, signOutAction }: { username: string; signOutAction: () => Promise<void> }) {
  const pathname = usePathname()

  return (
    <header className="border-b border-border bg-background">
      <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/profile" className="text-base font-bold tracking-tight">
            Root<span className="text-primary">Realm</span>
          </Link>
          <nav aria-label="Primary" className="flex items-center gap-1">
            {links.map((link) => {
              const active = pathname === link.href
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                    active
                      ? 'bg-secondary text-secondary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  {link.label}
                </Link>
              )
            })}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-muted-foreground sm:inline">{username}</span>
          <form action={signOutAction}>
            <button
              type="submit"
              className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  )
}