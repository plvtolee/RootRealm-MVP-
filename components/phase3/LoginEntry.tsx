'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithGitHub } from '@/lib/auth/actions';
import { RootRealmLogin } from './RootRealmEntryUI';

/**
 * Presentation-only wrapper that connects the supplied Phase 3 login UI to the
 * existing Phase 1 GitHub OAuth server action. No new auth logic is introduced.
 */
export function LoginEntry({ error }: { error?: string | null }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleSignIn = () => {
    setLoading(true);
    // Existing Phase 1 server action: starts OAuth and redirects to GitHub.
    void signInWithGitHub();
  };

  return (
    <RootRealmLogin
      onGithubSignIn={handleSignIn}
      onBackToHome={() => router.push('/')}
      loading={loading}
      error={error ?? undefined}
    />
  );
}

export default LoginEntry;