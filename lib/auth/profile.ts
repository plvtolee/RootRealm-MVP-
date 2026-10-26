import type { User } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Profile } from '@/lib/types'

/**
 * Derive a sensible username/avatar from GitHub OAuth metadata.
 */
function readGitHubMetadata(user: User) {
  const meta = user.user_metadata ?? {}
  const username =
    (meta.user_name as string | undefined) ??
    (meta.preferred_username as string | undefined) ??
    (meta.name as string | undefined) ??
    user.email?.split('@')[0] ??
    `realm-${user.id.slice(0, 8)}`

  const avatarUrl =
    (meta.avatar_url as string | undefined) ??
    (meta.picture as string | undefined) ??
    null

  return { username, avatarUrl }
}

/**
 * Ensure a profile row exists for the authenticated user, creating it from
 * their GitHub metadata on first sign-in. Safe to call on every request.
 *
 * Returns the current profile, or null if the user has no profile and could
 * not be created.
 */
export async function ensureProfile(user: User): Promise<Profile | null> {
  const admin = createAdminClient()

  const read = () =>
    admin.from('profiles').select('*').eq('id', user.id).maybeSingle()

  const { data: existing } = await read()
  if (existing) {
    return existing as Profile
  }

  const { username, avatarUrl } = readGitHubMetadata(user)

  const { data: created, error } = await admin
    .from('profiles')
    .upsert(
      {
        id: user.id,
        username,
        avatar_url: avatarUrl,
      },
      { onConflict: 'id', ignoreDuplicates: true }
    )
    .select('*')
    .maybeSingle()

  if (error || !created) {
    // A concurrent request may have created it first; re-read before
    // giving up so we never bounce a valid user back to login.
    const { data: retried } = await read()
    return (retried as Profile) ?? null
  }

  return created as Profile
}