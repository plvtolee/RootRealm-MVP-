/**
 * Auto-sync pacing.
 *
 * The app triggers a background sync when an authenticated page loads. To avoid
 * burning GitHub's Search API budget on every reload, auto-sync is skipped when
 * the last successful sync is newer than this cooldown. The manual "Sync GitHub"
 * button bypasses the cooldown.
 */
export const AUTO_SYNC_COOLDOWN_MS = 10 * 60 * 1000;

/** True when a sync should run (no prior sync, invalid timestamp, or stale). */
export function isSyncStale(
  lastSyncedAt: string | null | undefined,
  now: number = Date.now(),
  cooldownMs: number = AUTO_SYNC_COOLDOWN_MS
): boolean {
  if (!lastSyncedAt) return true;

  const timestamp = new Date(lastSyncedAt).getTime();
  if (!Number.isFinite(timestamp)) return true;

  return now - timestamp >= cooldownMs;
}
