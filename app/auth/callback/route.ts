import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ensureProfile } from '@/lib/auth/profile';
import { saveGitHubConnection } from '@/lib/github/token-store';

/**
 * OAuth callback. Supabase redirects here with a `code` after GitHub auth.
 * We exchange it for a session, bootstrap the profile, persist the encrypted
 * GitHub token for user-triggered activity sync, then send the user into the app.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/profile';
  const errorDescription = searchParams.get('error_description');

  if (errorDescription) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(errorDescription)}`
    );
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const supabase = createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  // Bootstrap the profile from trusted server-side user data.
  await ensureProfile(data.user);

  // Persist the GitHub identity and encrypted token for activity sync.
  // Failure here must not block sign-in; the UI prompts for re-auth instead.
  try {
    const metadata = data.user.user_metadata ?? {};
    const identity = data.user.identities?.find(
      (candidate) => candidate.provider === 'github'
    );
    const identityData = identity?.identity_data ?? {};

    const login =
      (metadata.user_name as string | undefined) ??
      (metadata.preferred_username as string | undefined) ??
      (identityData.user_name as string | undefined) ??
      (metadata.name as string | undefined) ??
      data.user.email?.split('@')[0] ??
      `realm-${data.user.id.slice(0, 8)}`;

    const rawId =
      metadata.provider_id ??
      identityData.sub ??
      identity?.id ??
      0;

    const githubId = Number(rawId);

    await saveGitHubConnection({
      userId: data.user.id,
      login,
      githubId: Number.isFinite(githubId) ? githubId : 0,
      scopes: ['read:user', 'user:email'],
      providerToken: data.session?.provider_token ?? null,
    });
  } catch (connectionError) {
    console.error(
      'Failed to persist GitHub connection:',
      connectionError instanceof Error ? connectionError.message : 'unknown error'
    );
  }

  return NextResponse.redirect(`${origin}${next}`);
}
