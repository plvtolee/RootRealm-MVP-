import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ensureProfile } from '@/lib/auth/profile'

/**
 * OAuth callback. Supabase redirects here with a `code` after GitHub auth.
 * We exchange it for a session, bootstrap the profile, then send the user
 * into the app.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/profile'
  const errorDescription = searchParams.get('error_description')

  if (errorDescription) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(errorDescription)}`
    )
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`)
  }

  const supabase = createClient()
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`)
  }

  // Bootstrap the profile from trusted server-side user data.
  await ensureProfile(data.user)

  return NextResponse.redirect(`${origin}${next}`)
}