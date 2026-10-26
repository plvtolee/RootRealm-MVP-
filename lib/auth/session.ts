import 'server-only'

import { cache } from 'react'
import { redirect } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { ensureProfile } from '@/lib/auth/profile'
import type { Profile } from '@/lib/types'

export interface SessionContext {
  user: User
  profile: Profile
}

/**
 * Resolve the authenticated user from cookies and load their profile.
 *
 * The user id always comes from the verified Supabase session, never from
 * client input. Redirects unauthenticated visitors to the login screen.
 *
 * Wrapped in React cache so the layout and page in a single request share one
 * session/profile lookup.
 */
export const requireSession = cache(async (): Promise<SessionContext> => {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const profile = await ensureProfile(user)

  if (!profile) {
    redirect('/login?error=profile_unavailable')
  }

  return { user, profile }
})