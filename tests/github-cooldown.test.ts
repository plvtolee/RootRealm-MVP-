import { describe, expect, it } from 'vitest';
import { AUTO_SYNC_COOLDOWN_MS, isSyncStale } from '@/lib/github/cooldown';

const NOW = new Date('2026-10-28T12:00:00.000Z').getTime();

describe('isSyncStale', () => {
  it('treats a missing timestamp as stale', () => {
    expect(isSyncStale(null, NOW)).toBe(true);
    expect(isSyncStale(undefined, NOW)).toBe(true);
  });

  it('does not sync inside the cooldown window', () => {
    const recent = new Date(NOW - 5 * 60 * 1000).toISOString();
    expect(isSyncStale(recent, NOW)).toBe(false);
  });

  it('syncs at exactly the cooldown boundary', () => {
    const boundary = new Date(NOW - AUTO_SYNC_COOLDOWN_MS).toISOString();
    expect(isSyncStale(boundary, NOW)).toBe(true);
  });

  it('syncs when the last sync is older than the cooldown', () => {
    const old = new Date(NOW - 60 * 60 * 1000).toISOString();
    expect(isSyncStale(old, NOW)).toBe(true);
  });

  it('treats an invalid timestamp as stale', () => {
    expect(isSyncStale('not-a-date', NOW)).toBe(true);
  });

  it('does not sync for a future timestamp (clock skew)', () => {
    const future = new Date(NOW + 60 * 1000).toISOString();
    expect(isSyncStale(future, NOW)).toBe(false);
  });

  it('supports a custom cooldown', () => {
    const twoMinutesAgo = new Date(NOW - 2 * 60 * 1000).toISOString();
    expect(isSyncStale(twoMinutesAgo, NOW, 60 * 1000)).toBe(true);
    expect(isSyncStale(twoMinutesAgo, NOW, 5 * 60 * 1000)).toBe(false);
  });
});
