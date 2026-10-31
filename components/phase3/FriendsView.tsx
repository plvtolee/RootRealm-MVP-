'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  sendFriendRequest,
  cancelFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  removeFriend,
} from '@/lib/social/actions';
import type { ConnectionData, ConnectionUIStatus, UserCardData } from './types';
import './Phase3.css';

interface FriendsViewProps {
  currentUserId: string;
  currentUserCoins: number;
  currentUsername: string;
  currentAvatarUrl: string | null;
  connections: {
    friends: ConnectionData[];
    incoming: ConnectionData[];
    outgoing: ConnectionData[];
  };
  recentUsers: UserCardData[];
  topUsers: UserCardData[];
  suggestedUsers: UserCardData[];
}

export function FriendsView({
  currentUserId,
  currentUserCoins,
  currentUsername,
  currentAvatarUrl,
  connections,
  recentUsers: initialRecentUsers,
  topUsers: initialTopUsers,
  suggestedUsers: initialSuggestedUsers,
}: FriendsViewProps) {
  const router = useRouter();
  const navigate = useCallback((section: string) => router.push(`/${section}`), [router]);
  const [activeTab, setActiveTab] = useState<'friends' | 'incoming' | 'outgoing' | 'search'>('incoming');
  const [pendingActions, setPendingActions] = useState<Set<string>>(new Set());
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserCardData[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [hasMoreResults, setHasMoreResults] = useState(false);
  const [searchOffset, setSearchOffset] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const friends = connections.friends;
  const incoming = connections.incoming;
  const outgoing = connections.outgoing;

  // Local state for discovery sections
  const [recentUsers, setRecentUsers] = useState(initialRecentUsers);
  const [topUsers, setTopUsers] = useState(initialTopUsers);
  const [suggestedUsers, setSuggestedUsers] = useState(initialSuggestedUsers);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!searchQuery.trim()) {
      setSearchResults([]);
      setHasMoreResults(false);
      setSearchOffset(0);
      return;
    }

    setIsSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/social/search?q=${encodeURIComponent(searchQuery.trim())}&limit=20`);
        if (!res.ok) throw new Error('Search failed');
        const data = await res.json();
        setSearchResults(data.users);
        setHasMoreResults(data.hasMore);
        setSearchOffset(data.users.length);
        setSearchError(null);
      } catch (e) {
        setSearchError('Failed to search users');
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery]);

  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setHasMoreResults(false);
    setSearchOffset(0);
    setSearchError(null);
  };

  const updateSectionUser = useCallback((userId: string, updater: (u: any) => any) => {
    setRecentUsers((prev) => prev.map((u) => (u.id === userId ? updater(u) : u)));
    setTopUsers((prev) => prev.map((u) => (u.id === userId ? updater(u) : u)));
    setSuggestedUsers((prev) => prev.map((u) => (u.id === userId ? updater(u) : u)));
  }, []);

  const handleFriendAction = useCallback(
    async (targetUser: any, action: 'send' | 'cancel') => {
      const pendingKey = `${action}-${targetUser.id}`;
      if (pendingActions.has(pendingKey)) return;

      setPendingActions((prev) => new Set(prev).add(pendingKey));
      setFeedback(null);

      try {
        let result: { ok: boolean; message: string };

        switch (action) {
          case 'send':
            result = await sendFriendRequest(targetUser.id);
            break;
          case 'cancel':
            result = await cancelFriendRequest(targetUser.connection_id!);
            break;
          default:
            result = { ok: false, message: 'Not implemented' };
        }

        if (result.ok) {
          setFeedback({ type: 'success', message: result.message });
          const newStatus = action === 'send' ? 'pending_outgoing' : 'none';
          const newConnectionId = action === 'send' ? 'new' : null;
          updateSectionUser(targetUser.id, (u) => ({
            ...u,
            connection_status: newStatus,
            connection_id: newConnectionId,
          }));
        } else {
          setFeedback({ type: 'error', message: result.message });
        }
      } catch (e) {
        setFeedback({ type: 'error', message: 'An unexpected error occurred' });
      } finally {
        setPendingActions((prev) => {
          const next = new Set(prev);
          next.delete(`${action}-${targetUser.id}`);
          return next;
        });
      }
    },
    [pendingActions, updateSectionUser]
  );

  const isPendingConnection = (connectionId: string) => pendingActions.has(connectionId);
  const isPendingUser = (userId: string) =>
    pendingActions.has(`send-${userId}`) || pendingActions.has(`cancel-${userId}`);

  const handleConnectionAction = useCallback(
    async (connectionId: string, action: 'accept' | 'decline' | 'cancel' | 'remove') => {
      if (pendingActions.has(connectionId)) return;

      setPendingActions((prev) => new Set(prev).add(connectionId));
      setFeedback(null);

      try {
        let result: { ok: boolean; message: string };

        switch (action) {
          case 'accept':
            result = await acceptFriendRequest(connectionId);
            break;
          case 'decline':
            result = await declineFriendRequest(connectionId);
            break;
          case 'cancel':
            result = await cancelFriendRequest(connectionId);
            break;
          case 'remove':
            result = await removeFriend(connectionId);
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
        setPendingActions((prev) => {
          const next = new Set(prev);
          next.delete(connectionId);
          return next;
        });
      }
    },
    [router, pendingActions]
  );

  const getTabData = (tab: typeof activeTab): ConnectionData[] => {
    switch (tab) {
      case 'friends':
        return friends;
      case 'incoming':
        return incoming;
      case 'outgoing':
        return outgoing;
    }
    return [];
  };

  const currentTabData = getTabData(activeTab);

  return (
    <div className="rr2-root rr2-friends-root">
      <FriendsTopBar
        username={currentUsername}
        avatarUrl={currentAvatarUrl}
        coins={currentUserCoins}
        navigate={navigate}
        activeSection="community"
        incomingCount={incoming.length}
      />

      <main className="rr2-main rr2-wrap">
        {feedback && (
          <div className={`rr2-feedback is-${feedback.type}`} role="status" aria-live="polite">
            {feedback.message}
          </div>
        )}

        <div className="rr2-friends-header">
          <h1 className="rr2-page-title">Friends</h1>
          <div className="rr2-friends-tabs" role="tablist" aria-label="Friend lists">
            <button
              role="tab"
              aria-selected={activeTab === 'friends'}
              aria-controls="friends-panel"
              id="friends-tab"
              className={`rr2-friends-tab ${activeTab === 'friends' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('friends')}
            >
              <span>Friends</span>
              <span className="rr2-friends-tab-count">{friends.length}</span>
            </button>
            <button
              role="tab"
              aria-selected={activeTab === 'incoming'}
              aria-controls="incoming-panel"
              id="incoming-tab"
              className={`rr2-friends-tab ${activeTab === 'incoming' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('incoming')}
            >
              <span>Incoming</span>
              <span className="rr2-friends-tab-count">{incoming.length}</span>
            </button>
            <button
              role="tab"
              aria-selected={activeTab === 'outgoing'}
              aria-controls="outgoing-panel"
              id="outgoing-tab"
              className={`rr2-friends-tab ${activeTab === 'outgoing' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('outgoing')}
            >
              <span>Outgoing</span>
              <span className="rr2-friends-tab-count">{outgoing.length}</span>
            </button>
            <button
              role="tab"
              aria-selected={activeTab === 'search'}
              aria-controls="search-panel"
              id="search-tab"
              className={`rr2-friends-tab ${activeTab === 'search' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('search')}
            >
              <span>Search</span>
              <span className="rr2-search-tab-count">{searchResults.length}</span>
            </button>
          </div>
        </div>

        <div role="tabpanel" id={`${activeTab}-panel`} aria-labelledby={`${activeTab}-tab`}>
          {activeTab === 'search' ? (
            <>
              <div className="rr2-search-section">
                <label htmlFor="friends-search" className="rr2-search-label">Search developers</label>
                <div className="rr2-search-input-wrapper">
                  <svg className="rr2-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input
                    id="friends-search"
                    type="search"
                    className="rr2-search-input"
                    placeholder="Search developers"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    aria-label="Search developers"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      className="rr2-search-clear"
                      onClick={handleClearSearch}
                      aria-label="Clear search"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  )}
                </div>
                {isSearching && <span className="rr2-search-loading" aria-live="polite">Searching…</span>}
              </div>
              <SearchResultsSection
                query={searchQuery}
                results={searchResults}
                isLoading={isSearching}
                error={searchError}
                hasMore={hasMoreResults}
                onLoadMore={() => setSearchOffset((o) => o + 20)}
                currentUserId={currentUserId}
                onFriendAction={handleFriendAction}
                pendingActions={pendingActions}
                setSearchQuery={setSearchQuery}
              />
            </>
          ) : currentTabData.length === 0 ? (
            <EmptyFriendsState activeTab={activeTab} />
          ) : (
            <div className="rr2-friends-list" role="list">
              {currentTabData.map((connection) => (
                <FriendConnectionCard
                  key={connection.id}
                  connection={connection}
                  currentUserId={currentUserId}
                  onAction={handleConnectionAction}
                  isPending={isPendingConnection(connection.id)}
                />
              ))}
            </div>
          )}

          {activeTab !== 'search' && (
            <div className="rr2-discovery-sections">
              <DiscoverySectionCard
                title="Recently Joined"
                subtitle="New developers in the realm"
                users={recentUsers.filter((u) => u.id !== currentUserId)}
                currentUserId={currentUserId}
                onFriendAction={handleFriendAction}
                isPending={isPendingUser}
              />
              <DiscoverySectionCard
                title="Top Developers"
                subtitle="Ranked by progression"
                users={topUsers.filter((u) => u.id !== currentUserId)}
                currentUserId={currentUserId}
                onFriendAction={handleFriendAction}
                isPending={isPendingUser}
              />
              <DiscoverySectionCard
                title="Suggested Developers"
                subtitle="Based on your activity"
                users={suggestedUsers.filter((u) => u.id !== currentUserId)}
                currentUserId={currentUserId}
                onFriendAction={handleFriendAction}
                isPending={isPendingUser}
              />
            </div>
          )}
        </div>
      </main>

      <footer className="rr2-footer">
        <span>ROOTREALM <strong>·</strong> PUBLIC ACTIVITY</span>
        <span>GITHUB SEARCH <strong>API</strong></span>
        <span>PRIVATE REPOSITORIES NOT TRACKED</span>
      </footer>
    </div>
  );
}

function FriendsTopBar({
  username,
  avatarUrl,
  coins,
  navigate,
  activeSection,
  incomingCount,
}: {
  username: string;
  avatarUrl: string | null;
  coins: number;
  navigate: (section: string) => void;
  activeSection: string;
  incomingCount: number;
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
        {incomingCount > 0 && (
          <span className="rr2-incoming-indicator" aria-label={`${incomingCount} incoming friend request${incomingCount !== 1 ? 's' : ''}`}>
            {incomingCount}
          </span>
        )}
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

function EmptyFriendsState({ activeTab }: { activeTab: 'friends' | 'incoming' | 'outgoing' }) {
  const messages = {
    friends: {
      title: 'No friends yet',
      subtitle: 'Start discovering developers to build your network',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
    },
    incoming: {
      title: 'No incoming requests',
      subtitle: 'Friend requests from other developers will appear here',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
          <path d="M22 12h-4l-3 9-3-9H2" />
          <circle cx="5.5" cy="5.5" r="2.5" />
          <circle cx="18.5" cy="5.5" r="2.5" />
        </svg>
      ),
    },
    outgoing: {
      title: 'No outgoing requests',
      subtitle: 'Sent friend requests will appear here',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
          <path d="M22 12h-4l-3 9-3-9H2" />
          <circle cx="5.5" cy="5.5" r="2.5" />
          <circle cx="18.5" cy="5.5" r="2.5" />
        </svg>
      ),
    },
  };

  const { title, subtitle, icon } = messages[activeTab];

  return (
    <div className="rr2-friends-empty" aria-live="polite">
      <div className="rr2-empty-icon">{icon}</div>
      <h2>{title}</h2>
      <p>{subtitle}</p>
    </div>
  );
}

function FriendConnectionCard({
  connection,
  currentUserId,
  onAction,
  isPending,
}: {
  connection: any;
  currentUserId: string;
  onAction: (connectionId: string, action: 'accept' | 'decline' | 'cancel' | 'remove') => void;
  isPending: boolean;
}) {
  const otherUser = connection.other_user;
  const isIncoming = connection.recipient_id === currentUserId;
  const status = connection.status;

  const getActionButtons = () => {
    if (!otherUser) return null;

    switch (status) {
      case 'pending':
        if (isIncoming) {
          return (
            <div className="rr2-friend-request-actions">
              <button
                type="button"
                className="rr2-button rr2-button-primary rr2-small-button"
                onClick={() => onAction(connection.id, 'accept')}
                disabled={isPending}
              >
                Accept
              </button>
              <button
                type="button"
                className="rr2-button rr2-button-secondary rr2-small-button"
                onClick={() => onAction(connection.id, 'decline')}
                disabled={isPending}
              >
                Decline
              </button>
            </div>
          );
        } else {
          return (
            <button
              type="button"
              className="rr2-button rr2-button-secondary rr2-small-button"
              onClick={() => onAction(connection.id, 'cancel')}
              disabled={isPending}
              aria-busy={isPending}
            >
              {isPending ? 'Cancelling…' : 'Cancel Request'}
            </button>
          );
        }
      case 'accepted':
        return (
          <div className="rr2-friend-actions">
            <button
              type="button"
              className="rr2-button rr2-button-secondary rr2-small-button"
              onClick={() => window.location.href = `/u/${otherUser.username}`}
            >
              View Profile
            </button>
            <button
              type="button"
              className="rr2-button rr2-button-danger rr2-small-button"
              onClick={() => onAction(connection.id, 'remove')}
              disabled={isPending}
              aria-busy={isPending}
            >
              {isPending ? 'Removing…' : 'Remove Friend'}
            </button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <article className="rr2-friend-card" role="listitem">
      <div className="rr2-friend-card-avatar" aria-hidden="true">
        {otherUser?.avatar_url ? (
          <img src={otherUser.avatar_url} alt="" />
        ) : (
          otherUser?.display_name.slice(0, 1).toUpperCase()
        )}
        {otherUser?.level && (
          <span className="rr2-friend-level-badge">Lv.{otherUser.level}</span>
        )}
      </div>
      <div className="rr2-friend-card-info">
        <div className="rr2-friend-card-header">
          <h3 className="rr2-friend-card-name">{otherUser?.display_name}</h3>
          <span className="rr2-friend-card-username">@{otherUser?.username}</span>
        </div>
        <div className="rr2-friend-card-meta">
          <span className="rr2-friend-card-xp">
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
            {otherUser?.total_xp.toLocaleString()} XP
          </span>
          <span className="rr2-friend-card-level">Level {otherUser?.level}</span>
        </div>
        <div className="rr2-friend-card-status">
          <ConnectionStatusBadge status={status === 'accepted' ? 'accepted' : 'pending_incoming'} />
        </div>
      </div>
      <div className="rr2-friend-card-actions">
        {getActionButtons()}
      </div>
    </article>
  );
}

function SearchResultsSection({
  query,
  results,
  isLoading,
  error,
  hasMore,
  onLoadMore,
  currentUserId,
  onFriendAction,
  pendingActions,
  setSearchQuery,
}: {
  query: string;
  results: UserCardData[];
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  onLoadMore: () => void;
  currentUserId: string;
  onFriendAction: (user: UserCardData, action: 'send' | 'cancel') => void;
  pendingActions: Set<string>;
  setSearchQuery: (v: string) => void;
}) {
  const isPending = (userId: string) =>
    pendingActions.has(`send-${userId}`) || pendingActions.has(`cancel-${userId}`);

  if (isLoading) {
    return (
      <section className="rr2-section" aria-label="Search results">
        <div className="rr2-section-head">
          <div className="rr2-kicker">SEARCH RESULTS</div>
          <h2>&ldquo;{query}&rdquo;</h2>
        </div>
        <div className="rr2-search-skeleton" aria-busy="true" aria-label="Loading search results">
          {[1, 2, 3].map((i) => <div key={i} className="rr2-skeleton-card" />)}
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="rr2-section" aria-label="Search error">
        <div className="rr2-empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
          <p>{error}</p>
        </div>
      </section>
    );
  }

  if (results.length === 0) {
    return (
      <section className="rr2-section" aria-label="No search results">
        <div className="rr2-empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <p>No developers found for &ldquo;{query}&rdquo;</p>
          <small>Try a different search term</small>
        </div>
      </section>
    );
  }

  return (
    <section className="rr2-section" aria-label="Search results">
      <div className="rr2-section-head">
        <div className="rr2-kicker">SEARCH RESULTS</div>
        <h2>&ldquo;{query}&rdquo;</h2>
        <span className="rr2-result-count">{results.length} developer{results.length !== 1 ? 's' : ''} found</span>
      </div>
      <div className="rr2-user-grid" role="list">
        {results.map((user) => (
          <UserCard
            key={user.id}
            user={user}
            currentUserId={currentUserId}
            onAction={onFriendAction}
            isPending={isPending(user.id)}
          />
        ))}
      </div>
      {hasMore && (
        <button
          type="button"
          className="rr2-load-more rr2-button rr2-button-secondary"
          onClick={onLoadMore}
        >
          Load more
        </button>
      )}
    </section>
  );
}

function DiscoverySectionCard({
  title,
  subtitle,
  users,
  currentUserId,
  onFriendAction,
  isPending,
}: {
  title: string;
  subtitle: string;
  users: UserCardData[];
  currentUserId: string;
  onFriendAction: (user: UserCardData, action: 'send' | 'cancel') => void;
  isPending: (id: string) => boolean;
}) {
  if (users.length === 0) return null;

  return (
    <section className="rr2-section rr2-discover-section" aria-labelledby={`${title.toLowerCase()}-heading`}>
      <div className="rr2-section-head">
        <div>
          <div className="rr2-kicker">{title.toUpperCase()}</div>
          <h2 id={`${title.toLowerCase()}-heading`}>{title}</h2>
          <p>{subtitle}</p>
        </div>
      </div>
      <div className="rr2-user-grid" role="list">
        {users.map((user) => (
          <UserCard
            key={user.id}
            user={user}
            currentUserId={currentUserId}
            onAction={onFriendAction}
            isPending={isPending(user.id)}
          />
        ))}
      </div>
    </section>
  );
}

function UserCard({
  user,
  currentUserId,
  onAction,
  isPending,
}: {
  user: UserCardData;
  currentUserId: string;
  onAction: (user: UserCardData, action: 'send' | 'cancel') => void;
  isPending: boolean;
}) {
  const isSelf = user.id === currentUserId;

  const getActionButton = () => {
    if (isSelf) return null;

    switch (user.connection_status) {
      case 'none':
        return (
          <button
            type="button"
            className="rr2-button rr2-button-primary rr2-small-button"
            onClick={() => onAction(user, 'send')}
            disabled={isPending}
            aria-busy={isPending}
          >
            {isPending ? 'Adding…' : 'Add Friend'}
          </button>
        );
      case 'pending_outgoing':
        return (
          <button
            type="button"
            className="rr2-button rr2-button-secondary rr2-small-button"
            onClick={() => onAction(user, 'cancel')}
            disabled={isPending}
            aria-busy={isPending}
          >
            {isPending ? 'Cancelling…' : 'Cancel Request'}
          </button>
        );
      default:
        return null;
    }
  };

  return (
    <article className="rr2-user-card" role="listitem">
      <div className="rr2-user-card-avatar" aria-hidden="true">
        {user.avatar_url ? (
          <img src={user.avatar_url} alt="" />
        ) : (
          user.display_name.slice(0, 1).toUpperCase()
        )}
        {user.level && (
          <span className="rr2-user-level-badge">Lv.{user.level}</span>
        )}
      </div>
      <div className="rr2-user-card-info">
        <div className="rr2-user-card-name-row">
          <h3 className="rr2-user-card-name">{user.display_name}</h3>
          <span className="rr2-user-card-username">@{user.username}</span>
        </div>
        <div className="rr2-user-card-meta">
          <span className="rr2-user-card-xp">
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
            {user.total_xp.toLocaleString()} XP
          </span>
          <span className="rr2-user-card-level">Level {user.level}</span>
        </div>
        <div className="rr2-user-card-status">
          <ConnectionStatusBadge status={user.connection_status} />
        </div>
      </div>
      <div className="rr2-user-card-actions">
        {getActionButton()}
        <button
          type="button"
          className="rr2-button rr2-button-secondary rr2-small-button rr2-view-profile-btn"
          onClick={() => window.location.href = `/u/${user.username}`}
        >
          View Profile
        </button>
      </div>
    </article>
  );
}

function ConnectionStatusBadge({ status }: { status: string }) {
  const configs: Record<string, { label: string; className: string }> = {
    none: { label: 'Not connected', className: 'rr2-status-none' },
    pending_outgoing: { label: 'Request sent', className: 'rr2-status-pending-outgoing' },
    pending_incoming: { label: 'Pending request', className: 'rr2-status-pending-incoming' },
    accepted: { label: 'Friends', className: 'rr2-status-accepted' },
  };

  const config = configs[status] || configs.none;
  return <span className={`rr2-connection-badge ${config.className}`}>{config.label}</span>;
}
