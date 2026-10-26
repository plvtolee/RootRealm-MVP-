'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

/**
 * Begin GitHub OAuth sign-in. Redirects to GitHub.
 */
export async function signInWithGitHub() {
  const supabase = createClient()
  const origin = headers().get('origin') ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: {
      redirectTo: `${origin}/auth/callback`,
    },
  })

  if (error || !data.url) {
    redirect('/login?error=oauth_unavailable')
  }

  redirect(data.url)
}

/**
 * Sign the user out and return them to the login screen.
 */
export async function signOut() {
  const supabase = createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}