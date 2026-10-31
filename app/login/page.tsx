import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LoginEntry } from '@/components/phase3/LoginEntry'

const errorMessages: Record<string, string> = {
  oauth_unavailable: 'GitHub sign-in is unavailable right now. Please try again.',
  auth_failed: 'We could not complete sign-in. Please try again.',
  missing_code: 'Sign-in was interrupted. Please try again.',
  profile_unavailable: 'We could not load your profile. Please try again.',
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string }
}) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect('/profile')
  }

  const error = searchParams.error
  const errorMessage = error ? errorMessages[error] ?? 'Something went wrong. Please try again.' : null

  return <LoginEntry error={errorMessage} />
}