import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { signInWithGitHub } from '@/lib/auth/actions'
import { Button } from '@/components/ui/button'

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

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-lg border border-border bg-card p-8 shadow-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold tracking-tight">
            Root<span className="text-primary">Realm</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Complete quests, earn XP and coins, and unlock avatar borders.
          </p>
        </div>

        {errorMessage && (
          <div
            role="alert"
            className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {errorMessage}
          </div>
        )}

        <form action={signInWithGitHub}>
          <Button type="submit" className="w-full" aria-label="Sign in with GitHub">
            <svg
              viewBox="0 0 16 16"
              aria-hidden="true"
              className="h-4 w-4 fill-current"
            >
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
            </svg>
            Sign in with GitHub
          </Button>
        </form>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Authentication only — we do not access your repositories.
        </p>
      </div>
    </main>
  )
}