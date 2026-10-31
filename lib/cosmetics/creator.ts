import 'server-only';

/**
 * Creator account identification.
 *
 * The creator is configured with the server-only environment variable
 * `ROOTREALM_CREATOR_USERNAME` (their RootRealm username, which defaults to
 * their GitHub login). It is never exposed to the client bundle: only the
 * derived boolean (`isCreator`) is passed to the Shop.
 *
 * See `.env.example` and `docs/SETUP.md` for configuration.
 */
export const CREATOR_ENV_KEY = 'ROOTREALM_CREATOR_USERNAME';

export function getCreatorUsername(): string | null {
  const raw = process.env[CREATOR_ENV_KEY]?.trim();
  return raw ? raw.toLowerCase() : null;
}

export function isCreatorUsername(username: string | null | undefined): boolean {
  const creator = getCreatorUsername();
  if (!creator || !username) return false;
  return username.trim().toLowerCase() === creator;
}

export function isCreatorProfile(
  profile: { username?: string | null } | null | undefined
): boolean {
  return isCreatorUsername(profile?.username);
}