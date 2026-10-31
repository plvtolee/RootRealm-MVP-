'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  sendFriendRequest,
  cancelFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  removeFriend,
} from '@/lib/social/actions';
import type { PublicProfileData, ConnectionUIStatus } from './types';
import './Phase3.css';

const COSMETIC_ICONS: Record<string, string> = {
  basic: '◇',
  silver: '◈',
  gold: '✧',
  neon: '⌁',
};

function cosmeticIcon(previewValue: string): string {
  return COSMETIC_ICONS[previewValue] ?? '✦';
}

function cosmeticKindLabel(type: string): string {
  if (type === 'avatar_border') return 'AVATAR BORDER';
  return type.replaceAll('_', ' ').toUpperCase();
}

interface PublicProfileViewProps {
  currentUserId: string;
  currentUserCoins: number;
  currentUsername: string;
  currentAvatarUrl: string | null;
  publicProfile: PublicProfileData;
}

export function PublicProfileView({
  currentUserId,
  currentUserCoins,
  currentUsername,
  currentAvatarUrl,
  publicProfile,
}: PublicProfileViewProps) {
  const router = useRouter();
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  const isSelf = publicProfile.id === currentUserId;
  const status = publicProfile.connection_status as ConnectionUIStatus;
  const connectionId = publicProfile.connection_id;

  const navigate = useCallback((section: string) => router.push(`/${section}`), [router]);

  const handleFriendAction = useCallback(
    async (action: 'send' | 'cancel' | 'accept' | 'decline' | 'remove') => {
      if (!connectionId && action !== 'send') return;

      setPendingAction(connectionId ?? 'send');
      setFeedback(null);

      try {
        let result: { ok: boolean; message: string };

        switch (action) {
          case 'send':
            result = await sendFriendRequest(publicProfile.id);
            break;
          case 'cancel':
            result = await cancelFriendRequest(connectionId!);
            break;
          case 'accept':
            result = await acceptFriendRequest(connectionId!);
            break;
          case 'decline':
            result = await declineFriendRequest(connectionId!);
            break;
          case 'remove':
            result = await removeFriend(connectionId!);
            break;
          default:
            result = { ok: false, message: 'Unknown action' };
        }

        if (result.ok) {
          setFeedback({ type: 'success', message: result.message });
          router.refresh();
        } else {
          setFeedback({ type: 'error', message: result.message });
        }
      } catch (e) {
        setFeedback({ type: 'error', message: 'An unexpected error occurred' });
      } finally {
        setPendingAction(null);
      }
    },
    [publicProfile.id, connectionId, router]
  );

  const getActionButtons = () => {
    if (isSelf) {
      return (
        <div className="rr2-public-profile-actions">
          <button
            type="button"
            className="rr2-button rr2-button-secondary"
            onClick={() => router.push('/settings')}
          >
            Edit Profile
          </button>
        </div>
      );
    }

    switch (status) {
      case 'none':
        return (
          <div className="rr2-public-profile-actions">
            <button
              type="button"
              className="rr2-button rr2-button-primary"
              onClick={() => handleFriendAction('send')}
              disabled={pendingAction === 'send'}
            >
              {pendingAction === 'send' ? 'Adding…' : 'Add Friend'}
            </button>
          </div>
        );
      case 'pending_outgoing':
        return (
          <div className="rr2-public-profile-actions">
            <button
              type="button"
              className="rr2-button rr2-button-secondary"
              onClick={() => handleFriendAction('cancel')}
              disabled={pendingAction === connectionId}
            >
              {pendingAction === connectionId ? 'Cancelling…' : 'Cancel Request'}
            </button>
          </div>
        );
      case 'pending_incoming':
        return (
          <div className="rr2-friend-request-actions">
            <button
              type="button"
              className="rr2-button rr2-button-primary"
              onClick={() => handleFriendAction('accept')}
              disabled={pendingAction === connectionId}
            >
              Accept
            </button>
            <button
              type="button"
              className="rr2-button rr2-button-secondary"
              onClick={() => handleFriendAction('decline')}
              disabled={pendingAction === connectionId}
            >
              Decline
            </button>
          </div>
        );
      case 'accepted':
        return (
          <div className="rr2-public-profile-actions">
            <button
              type="button"
              className="rr2-button rr2-button-secondary"
              onClick={() => handleFriendAction('remove')}
              disabled={pendingAction === connectionId}
            >
              {pendingAction === connectionId ? 'Removing…' : 'Remove Friend'}
            </button>
          </div>
        );
      default:
        return null;
    }
  };

  const xpIntoLevel = publicProfile.stats.total_xp % 100;
  const xpForNextLevel = 100;
  const xpProgress = Math.round((xpIntoLevel / xpForNextLevel) * 100);
  const displayName = publicProfile.display_name || publicProfile.username;

  return (
    <div className="rr2-root rr2-public-profile-root">
      <PublicProfileTopBar
        username={currentUsername}
        avatarUrl={currentAvatarUrl}
        coins={currentUserCoins}
        navigate={navigate}
        activeSection="profile"
      />

      <main className="rr2-main rr2-wrap">
        {feedback && (
          <div className={`rr2-feedback is-${feedback.type}`} role="status" aria-live="polite">
            {feedback.message}
          </div>
        )}

        {/* Profile Hero */}
        <section className="rr2-public-profile-hero" aria-labelledby="profile-name">
          <div
            className="rr2-profile-avatar"
            data-cosmetic={publicProfile.equipped_cosmetic?.preview_value}
            aria-label={`Avatar for ${displayName}`}
          >
            {publicProfile.avatar_url ? (
              <img src={publicProfile.avatar_url} alt="" />
            ) : (
              displayName.slice(0, 1).toUpperCase()
            )}
          </div>

          <div className="rr2-public-profile-identity">
            <h1 id="profile-name" className="rr2-public-profile-name">
              {displayName}
            </h1>
            <p className="rr2-public-profile-username">@{publicProfile.username}</p>

            <div className="rr2-public-profile-meta">
              <span>Joined {new Date(publicProfile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
              <span>{publicProfile.visibility === 'public' ? 'Public profile' : 'Private profile'}</span>
            </div>

            <div className="rr2-public-profile-stats">
              <div className="rr2-public-profile-stat">
                <span className="rr2-public-profile-stat-value">{publicProfile.stats.level}</span>
                <span className="rr2-public-profile-stat-label">Level</span>
              </div>
              <div className="rr2-public-profile-stat">
                <span className="rr2-public-profile-stat-value">{publicProfile.stats.total_xp.toLocaleString()}</span>
                <span className="rr2-public-profile-stat-label">Total XP</span>
              </div>
              <div className="rr2-public-profile-stat">
                <span className="rr2-public-profile-stat-value">{publicProfile.stats.quests_completed}</span>
                <span className="rr2-public-profile-stat-label">Quests</span>
              </div>
              <div className="rr2-public-profile-stat">
                <span className="rr2-public-profile-stat-value">{publicProfile.stats.commits + publicProfile.stats.merged_prs}</span>
                <span className="rr2-public-profile-stat-label">Activity</span>
              </div>
            </div>

            {/* XP Progress */}
            <div className="rr2-profile-xp" style={{ width: '100%', maxWidth: '400px' }}>
              <span className="rr2-kicker">EXPERIENCE</span>
              <strong>{publicProfile.stats.total_xp.toLocaleString()} XP</strong>
              <div
                className="rr2-xp-track"
                style={{ width: '100%' }}
                role="progressbar"
                aria-valuenow={Math.round((publicProfile.stats.total_xp % 100) / 100 * 100)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`XP progress to level ${publicProfile.stats.level + 1}`}
              >
                <i style={{ width: `${Math.round((publicProfile.stats.total_xp % 100) / 100 * 100)}%` }} />
              </div>
              <small>{100 - (publicProfile.stats.total_xp % 100)} XP to next level</small>
            </div>

            {getActionButtons()}
          </div>
        </section>

        {/* Developer Activity */}
        <section className="rr2-public-profile-section" aria-labelledby="activity-heading">
          <div className="rr2-public-profile-section-head">
            <h3 id="activity-heading">Developer Activity</h3>
          </div>
          <div className="rr2-public-profile-grid">
            <article className="rr2-public-profile-card">
              <h4>Commits</h4>
              <p>{publicProfile.stats.commits.toLocaleString()} qualifying commits</p>
            </article>
            <article className="rr2-public-profile-card">
              <h4>Merged Pull Requests</h4>
              <p>{publicProfile.stats.merged_prs.toLocaleString()} PRs merged</p>
            </article>
            <article className="rr2-public-profile-card">
              <h4>Repositories</h4>
              <p>{publicProfile.stats.repositories.toLocaleString()} active repositories</p>
            </article>
          </div>
        </section>

        {/* Completed Quests */}
        {publicProfile.stats.quests_completed > 0 && (
          <section className="rr2-public-profile-section" aria-labelledby="quests-heading">
            <div className="rr2-public-profile-section-head">
              <h3 id="quests-heading">Completed Quests</h3>
            </div>
            <p className="rr2-public-profile-card">
              {publicProfile.stats.quests_completed} quest{publicProfile.stats.quests_completed !== 1 ? 's' : ''} completed
            </p>
          </section>
        )}

        {/* Cosmetics */}
        {publicProfile.equipped_cosmetic && (
          <section className="rr2-public-profile-section" aria-labelledby="cosmetics-heading">
            <div className="rr2-public-profile-section-head">
              <h3 id="cosmetics-heading">Equipped cosmetics</h3>
            </div>
            <div className="rr2-loadout">
              <div className="rr2-loadout-chip">
                <span
                  className="rr2-cosmetic-art"
                  data-cosmetic={publicProfile.equipped_cosmetic.preview_value}
                  aria-hidden="true"
                >
                  {cosmeticIcon(publicProfile.equipped_cosmetic.preview_value)}
                </span>
                <span>
                  <strong>{publicProfile.equipped_cosmetic.name}</strong>
                  {cosmeticKindLabel(publicProfile.equipped_cosmetic.cosmetic_type)}
                </span>
              </div>
            </div>
          </section>
        )}
      </main>

      <footer className="rr2-footer">
        <span>ROOTREALM <strong>·</strong> PUBLIC ACTIVITY</span>
        <span>GITHUB SEARCH <strong>API</strong></span>
        <span>PRIVATE REPOSITORIES NOT TRACKED</span>
      </footer>
    </div>
  );
}

function PublicProfileTopBar({
  username,
  avatarUrl,
  coins,
  navigate,
  activeSection,
}: {
  username: string;
  avatarUrl: string | null;
  coins: number;
  navigate: (section: string) => void;
  activeSection: string;
}) {
  const sections = [
    { id: 'profile', label: 'Profile', icon: '◉' },
    { id: 'quests', label: 'Quests', icon: '◇' },
    { id: 'shop', label: 'Shop', icon: '✧' },
    { id: 'community', label: 'Community', icon: '◎' },
  ];

  return (
    <header className="rr2-topbar rr2-discover-topbar">
      <button
        type="button"
        className="rr2-wordmark"
        aria-label="Go to profile"
        onClick={() => navigate('profile')}
      >
        <span className="rr2-brand-mark" aria-hidden="true">✳</span>
        <span className="rr2-wordmark-label">ROOT<span className="rr2-wordmark-muted">REALM</span></span>
      </button>

      <nav className="rr2-nav" aria-label="RootRealm sections">
        {sections.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-current={activeSection === item.id ? 'page' : undefined}
            onClick={() => navigate(item.id)}
            className={activeSection === item.id ? 'rr2-nav-active' : ''}
          >
            <span className="rr2-nav-icon" aria-hidden="true">{item.icon}</span>{item.label}
          </button>
        ))}
      </nav>

      <div className="rr2-account">
        <div className="rr2-coin-chip" aria-label={`${coins.toLocaleString()} CodeCoins`}>
          <span aria-hidden="true">◆</span>
          <strong>{coins.toLocaleString()}</strong>
          <small>CC</small>
        </div>
        <details className="rr2-account-menu">
          <summary className="rr2-account-info" aria-label="Account menu">
            <div className="rr2-mini-avatar" aria-hidden="true">
              {avatarUrl ? <img src={avatarUrl} alt="" /> : username.slice(0, 1).toUpperCase()}
            </div>
            <span className="rr2-account-name">{username}<small>DEVELOPER PROFILE</small></span>
            <span className="rr2-chevron" aria-hidden="true">⌄</span>
          </summary>
          <div className="rr2-account-popover">
            <form action={async () => {}}>
              <button type="submit" className="rr2-button rr2-button-secondary rr2-small-button">Sign out</button>
            </form>
          </div>
        </details>
      </div>
    </header>
  );
}