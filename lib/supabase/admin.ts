import 'server-only'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * Service-role Supabase client.
 *
 * ONLY import this from server-only code (Server Components, Route Handlers,
 * Server Actions). It bypasses Row Level Security, so it must never reach a
 * client bundle. The `server-only` import guards against accidental client
 * imports at build time.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    throw new Error(
      'Missing Supabase service-role configuration. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.'
    )
  }

  return createSupabaseClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}