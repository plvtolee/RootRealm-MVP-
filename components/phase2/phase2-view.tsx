'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import RootRealmPhase2 from './RootRealmPhase2';
import type {
  CosmeticAction,
  Phase2Feedback,
  RootRealmChrome,
  RootRealmCosmetic,
  RootRealmProfileData,
  RootRealmQuest,
  RootRealmSection,
} from './types';
import { syncGithubActivity } from '@/lib/quests/actions';
import { equipCosmetic, purchaseCosmetic } from '@/lib/shop/actions';

export interface Phase2Connection {
  lastSyncedAt: string | null;
  needsReauth: boolean;
}

interface Phase2ViewProps {
  section: RootRealmSection;
  chrome: RootRealmChrome;
  profile?: RootRealmProfileData;
  quests?: RootRealmQuest[];
  cosmetics?: RootRealmCosmetic[];
  connection?: Phase2Connection | null;
  connectAction: () => Promise<void>;
  signOutAction: () => Promise<void>;
}

/**
 * Integration boundary between the Phase 2 presentation kit and the Phase 1
 * server actions. All mutations still run server-side; this component only
 * supplies real data shapes, handlers, pending states, and feedback.
 */
export function Phase2View({
  section,
  chrome,
  profile,
  quests = [],
  cosmetics = [],
  connection = null,
  connectAction,
  signOutAction,
}: Phase2ViewProps) {
  const router = useRouter();
  const [feedback, setFeedback] = useState<Phase2Feedback | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [pendingCosmeticId, setPendingCosmeticId] = useState<string | null>(null);

  function navigate(next: RootRealmSection) {
    if (next === section) return;
    router.push(next === 'profile' ? '/profile' : next === 'quests' ? '/quests' : next === 'shop' ? '/shop' : '/community');
  }

  async function handleSync() {
    setFeedback(null);
    setSyncing(true);

    try {
      const result = await syncGithubActivity({ force: true });

      if (result.skipped) {
        setFeedback({ type: 'success', message: 'Already synced recently.' });
        return;
      }

      if (result.ok) {
        const summary = result.summary;
        const parts: string[] = [];

        if (summary) {
          const count = summary.eventsInserted;
          parts.push(`${count} new event${count === 1 ? '' : 's'}`);

          if (summary.questsCompleted.length > 0) {
            parts.push(
              `completed ${summary.questsCompleted.map((quest) => quest.title).join(', ')}`
            );
          } else {
            parts.push('no new quest completions');
          }

          if (summary.truncated) {
            parts.push('history truncated at the GitHub search cap');
          }
        }

        setFeedback({
          type: 'success',
          message: parts.length > 0 ? `Sync complete — ${parts.join('; ')}.` : 'Sync complete.',
        });
        router.refresh();
        return;
      }

      if (result.reason === 'rate_limited') {
        const resetAt = result.summary?.rateLimitResetAt;
        const localReset = resetAt ? new Date(resetAt).toLocaleString() : null;

        setFeedback({
          type: 'error',
          message: localReset
            ? `GitHub rate limit reached. Try again at ${localReset}.`
            : 'GitHub rate limit reached. Try again later.',
        });
        router.refresh();
        return;
      }

      setFeedback({ type: 'error', message: result.message });
    } catch {
      setFeedback({
        type: 'error',
        message: 'Could not sync GitHub activity. Please try again.',
      });
    } finally {
      setSyncing(false);
    }
  }

  async function handleCosmeticAction(cosmeticId: string, action: CosmeticAction) {
    setFeedback(null);
    setPendingCosmeticId(cosmeticId);

    try {
      const result =
        action === 'purchase'
          ? await purchaseCosmetic(cosmeticId)
          : action === 'unequip'
            ? await equipCosmetic(null)
            : await equipCosmetic(cosmeticId);

      setFeedback({
        type: result.ok ? 'success' : 'error',
        message: result.message,
      });

      if (result.ok) router.refresh();
    } catch {
      setFeedback({
        type: 'error',
        message: 'Could not complete that action. Please try again.',
      });
    } finally {
      setPendingCosmeticId(null);
    }
  }

  return (
    <RootRealmPhase2
      section={section}
      chrome={chrome}
      profile={profile}
      quests={quests}
      cosmetics={cosmetics}
      feedback={feedback}
      lastSyncedAt={connection?.lastSyncedAt ?? null}
      needsReauth={connection?.needsReauth ?? false}
      syncing={syncing}
      pendingCosmeticId={pendingCosmeticId}
      onSectionChange={navigate}
      onCosmeticAction={handleCosmeticAction}
      onCustomizeProfile={() => navigate('shop')}
      onSync={handleSync}
      connectAction={connectAction}
      signOutAction={signOutAction}
    />
  );
}
