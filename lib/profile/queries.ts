import 'server-only'

import { createClient } from '@/lib/supabase/server'
import { getProgression } from '@/lib/progression'
import type { Cosmetic, Profile, ProfileActivityStats } from '@/lib/types'

export interface ProfileGitHubStatus {
  last_synced_at: string | null
  needs_reauth: boolean
  initial_sync_completed_at: string | null
  commits_history_complete: boolean
  prs_history_complete: boolean
}

export interface ProfileOverview {
  profile: Profile
  equipped: Cosmetic | null
  questsCompleted: number
  progression: ReturnType<typeof getProgression>
  github: ProfileGitHubStatus | null
}

/**
 * Load the data needed by the Profile section for one user.
 */
export async function getProfileOverview(profile: Profile): Promise<ProfileOverview> {
  const supabase = createClient()

  const [{ data: equipped }, { count }, { data: github }] = await Promise.all([
    profile.equipped_cosmetic_id
      ? supabase
          .from('cosmetics')
          .select('*')
          .eq('id', profile.equipped_cosmetic_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from('quest_completions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', profile.id),
    supabase
      .from('github_connections')
      .select(
        'last_synced_at, needs_reauth, initial_sync_completed_at, commits_history_complete, prs_history_complete'
      )
      .eq('user_id', profile.id)
      .maybeSingle(),
  ])

  return {
    profile,
    equipped: (equipped as Cosmetic | null) ?? null,
    questsCompleted: count ?? 0,
    progression: getProgression(profile.total_xp),
    github: (github as ProfileGitHubStatus | null) ?? null,
  }
}

interface ActivityRow {
  repo_full_name: string
  occurred_at: string
}

/**
 * Aggregate the public activity stored for a user.
 *
 * The sync stores at most 1,000 commits and 1,000 merged PRs (GitHub Search
 * caps each query at 1,000), so fetching those bounds covers the tracked set
 * without relying on a client-side aggregate query.
 */
export async function getProfileActivityStats(userId: string): Promise<ProfileActivityStats> {
  const supabase = createClient()

  const [commitsResponse, prsResponse] = await Promise.all([
    supabase
      .from('github_activity_events')
      .select('repo_full_name, occurred_at')
      .eq('user_id', userId)
      .eq('activity_type', 'commit')
      .order('occurred_at', { ascending: false })
      .limit(1000),
    supabase
      .from('github_activity_events')
      .select('repo_full_name, occurred_at')
      .eq('user_id', userId)
      .eq('activity_type', 'merged_pr')
      .order('occurred_at', { ascending: false })
      .limit(1000),
  ])

  if (commitsResponse.error) throw new Error(commitsResponse.error.message)
  if (prsResponse.error) throw new Error(prsResponse.error.message)

  const commits = (commitsResponse.data ?? []) as ActivityRow[]
  const prs = (prsResponse.data ?? []) as ActivityRow[]
  const repositories = new Set<string>()
  const activeDays = new Set<string>()
  let firstActivityAt: string | null = null
  let lastActivityAt: string | null = null

  for (const row of [...commits, ...prs]) {
    repositories.add(row.repo_full_name)
    activeDays.add(row.occurred_at.slice(0, 10))
    if (!firstActivityAt || row.occurred_at < firstActivityAt) firstActivityAt = row.occurred_at
    if (!lastActivityAt || row.occurred_at > lastActivityAt) lastActivityAt = row.occurred_at
  }

  return {
    commits: commits.length,
    mergedPrs: prs.length,
    repositories: repositories.size,
    activeDays: activeDays.size,
    firstActivityAt,
    lastActivityAt,
  }
}
