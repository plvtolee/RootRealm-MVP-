'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { syncGithubActivity } from '@/lib/quests/actions';

const BLOCKED_UNTIL_KEY = 'rootrealm:auto-sync-blocked-until';
const RATE_LIMIT_FALLBACK_MS = 5 * 60 * 1000;

function readBlockedUntil(): number {
  try {
    const value = Number(window.sessionStorage.getItem(BLOCKED_UNTIL_KEY));
    return Number.isFinite(value) ? value : 0;
  } catch {
    return 0;
  }
}

function writeBlockedUntil(timestamp: number): void {
  try {
    window.sessionStorage.setItem(BLOCKED_UNTIL_KEY, String(timestamp));
  } catch {
    // Storage can be unavailable in privacy modes; auto-sync still works.
  }
}

/**
 * Silently syncs GitHub activity once when an authenticated page loads.
 *
 * The server enforces a 10-minute cooldown, so full reloads do not hammer the
 * GitHub Search API. The manual "Sync GitHub" button bypasses the cooldown.
 * Auto-sync is best-effort: errors are surfaced only by the manual action.
 */
export function AutoSync() {
  const router = useRouter();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    if (Date.now() < readBlockedUntil()) return;

    void (async () => {
      try {
        const result = await syncGithubActivity({ force: false });

        if (result.ok && !result.skipped) {
          router.refresh();
          return;
        }

        if (result.reason === 'rate_limited') {
          const resetAt = result.summary?.rateLimitResetAt;
          const resetTime = resetAt ? new Date(resetAt).getTime() : NaN;
          const until = Number.isFinite(resetTime)
            ? resetTime
            : Date.now() + RATE_LIMIT_FALLBACK_MS;

          if (until > Date.now()) {
            writeBlockedUntil(until);
          }
        }
      } catch {
        // Best-effort; the manual Sync button surfaces actionable errors.
      }
    })();
  }, [router]);

  return null;
}
