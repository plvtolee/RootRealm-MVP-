import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import type { GitHubConnection } from '@/lib/types';
import { decryptToken, encryptToken } from './crypto';

export interface SaveConnectionInput {
  userId: string;
  login: string;
  githubId: number;
  scopes: string[];
  providerToken: string | null;
}

/**
 * Persist the non-secret connection metadata and (when provided) the
 * encrypted GitHub token. Called only from the OAuth callback.
 */
export async function saveGitHubConnection(input: SaveConnectionInput): Promise<void> {
  const admin = createAdminClient();

  const { error: connectionError } = await admin.from('github_connections').upsert(
    {
      user_id: input.userId,
      github_login: input.login,
      github_user_id: input.githubId,
      scopes: input.scopes,
      needs_reauth: false,
    },
    { onConflict: 'user_id' }
  );

  if (connectionError) {
    throw new Error(`Could not save GitHub connection: ${connectionError.message}`);
  }

  if (input.providerToken) {
    const { error: tokenError } = await admin.from('github_oauth_tokens').upsert(
      {
        user_id: input.userId,
        ciphertext: encryptToken(input.providerToken),
        key_version: 1,
      },
      { onConflict: 'user_id' }
    );

    if (tokenError) {
      throw new Error(`Could not store GitHub token: ${tokenError.message}`);
    }
    return;
  }

  // No token supplied. Keep an existing token; otherwise require re-auth.
  const { data: existingToken } = await admin
    .from('github_oauth_tokens')
    .select('user_id')
    .eq('user_id', input.userId)
    .maybeSingle();

  if (!existingToken) {
    await admin
      .from('github_connections')
      .update({ needs_reauth: true })
      .eq('user_id', input.userId);
  }
}

export async function loadGitHubConnection(
  userId: string
): Promise<GitHubConnection | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('github_connections')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Could not load GitHub connection: ${error.message}`);
  }

  return (data as GitHubConnection | null) ?? null;
}

export async function loadDecryptedToken(userId: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('github_oauth_tokens')
    .select('ciphertext')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Could not load GitHub token: ${error.message}`);
  }

  if (!data?.ciphertext) {
    return null;
  }

  return decryptToken(data.ciphertext as string);
}

export async function markNeedsReauth(userId: string): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from('github_connections')
    .update({ needs_reauth: true })
    .eq('user_id', userId);
}
