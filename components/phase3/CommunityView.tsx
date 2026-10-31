'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  acceptFriendRequest,
  cancelFriendRequest,
  declineFriendRequest,
  removeFriend,
  sendFriendRequest,
} from '@/lib/social/actions';
import type { ConnectionData, UserCardData } from './types';
import RootRealmCommunity, {
  type CommunityMember,
  type CommunityRequest,
  type RelationshipState,
} from './RootRealmEntryUI';

type CommunitySection = 'profile' | 'quests' | 'shop' | 'community';

interface CommunityViewProps {
  currentUserId: string;
  currentUsername: string;
  currentDisplayName: string;
  currentAvatarUrl: string | null;
  currentLevel: number;
  connections: {
    friends: ConnectionData[];
    incoming: ConnectionData[];
    outgoing: ConnectionData[];
  };
  recentUsers: UserCardData[];
  topUsers: UserCardData[];
  suggestedUsers: UserCardData[];
  signOutAction: () => Promise<void>;
}

const AVATAR_STYLES: NonNullable<CommunityMember['avatarStyle']>[] = [
  'stone',
  'ash',
  'moss',
  'rust',
  'ice',
  'sand',
];

function hashString(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function avatarStyle(id: string): CommunityMember['avatarStyle'] {
  return AVATAR_STYLES[hashString(id) % AVATAR_STYLES.length];
}

function initialOf(value: string): string {
  return value.trim().slice(0, 1).toUpperCase() || '?';
}

function relationshipFromStatus(status: string): RelationshipState {
  switch (status) {
    case 'accepted':
      return 'friends';
    case 'pending_outgoing':
      return 'outgoing';
    case 'pending_incoming':
      return 'incoming';
    default:
      return 'none';
  }
}

function userToMember(user: UserCardData, joinedLabel?: string): CommunityMember {
  const displayName = user.display_name || user.username;
  return {
    id: user.id,
    username: user.username,
    displayName,
    initials: initialOf(displayName),
    level: user.level,
    xp: user.total_xp,
    relationship: relationshipFromStatus(user.connection_status),
    joinedLabel,
    avatarUrl: user.avatar_url,
    avatarStyle: avatarStyle(user.id),
  };
}

function connectionToMember(
  connection: ConnectionData,
  relationship: RelationshipState
): CommunityMember | null {
  const other = connection.other_user;
  if (!other) return null;
  const displayName = other.display_name || other.username;
  return {
    id: other.id,
    username: other.username,
    displayName,
    initials: initialOf(displayName),
    level: other.level,
    xp: other.total_xp,
    relationship,
    avatarUrl: other.avatar_url,
    avatarStyle: avatarStyle(other.id),
  };
}

/**
 * Presentation adapter between the existing Phase 3 social queries/actions and
 * the supplied RootRealm Community UI. It keeps all search, connection and
 * navigation behaviour intact while only replacing the presentation.
 */
export function CommunityView({
  currentUserId,
  currentUsername,
  currentDisplayName,
  currentAvatarUrl,
  currentLevel,
  connections,
  recentUsers,
  topUsers,
  suggestedUsers,
  signOutAction,
}: CommunityViewProps) {
  const router = useRouter();

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );
  const [pending, setPending] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserCardData[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchVersion, setSearchVersion] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Existing debounced server-side search. The Community UI treats the
  // returned members as the authoritative search result set.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const query = searchQuery.trim();
    if (!query) {
      setSearchResults([]);
      setSearchError(null);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/social/search?q=${encodeURIComponent(query)}&limit=20`
        );
        if (!response.ok) throw new Error('Search failed');
        const data = (await response.json()) as { users?: UserCardData[] };
        setSearchResults(Array.isArray(data.users) ? data.users : []);
        setSearchError(null);
      } catch {
        setSearchResults([]);
        setSearchError('Could not search developers right now.');
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery, searchVersion]);

  // The Community UI passes member ids for cancel/remove, so map them back to
  // the real connection ids expected by the existing server actions.
  const outgoingByMember = useMemo(() => {
    const map = new Map<string, string>();
    for (const connection of connections.outgoing) {
      if (connection.other_user) map.set(connection.other_user.id, connection.id);
    }
    return map;
  }, [connections.outgoing]);

  const friendsByMember = useMemo(() => {
    const map = new Map<string, string>();
    for (const connection of connections.friends) {
      if (connection.other_user) map.set(connection.other_user.id, connection.id);
    }
    return map;
  }, [connections.friends]);

  // Combine the existing discovery queries into the single Discover grid.
  // Members from the "recently joined" query carry a label so the supplied
  // Recently joined filter still works.
  const discoveryMembers = useMemo(() => {
    const recentIds = new Set(recentUsers.map((user) => user.id));
    const map = new Map<string, CommunityMember>();
    const add = (user: UserCardData) => {
      if (map.has(user.id)) return;
      map.set(
        user.id,
        userToMember(user, recentIds.has(user.id) ? 'Recently joined' : undefined)
      );
    };
    recentUsers.forEach(add);
    topUsers.forEach(add);
    suggestedUsers.forEach(add);
    return Array.from(map.values());
  }, [recentUsers, topUsers, suggestedUsers]);

  const friends = useMemo(
    () =>
      connections.friends
        .map((connection) => connectionToMember(connection, 'friends'))
        .filter((member): member is CommunityMember => member !== null),
    [connections.friends]
  );

  const requests = useMemo<CommunityRequest[]>(() => {
    const incoming: CommunityRequest[] = connections.incoming
      .map((connection): CommunityRequest | null => {
        const member = connectionToMember(connection, 'incoming');
        return member
          ? { id: connection.id, member, direction: 'incoming' }
          : null;
      })
      .filter((request): request is CommunityRequest => request !== null);

    const outgoing: CommunityRequest[] = connections.outgoing
      .map((connection): CommunityRequest | null => {
        const member = connectionToMember(connection, 'outgoing');
        return member
          ? { id: connection.id, member, direction: 'outgoing' }
          : null;
      })
      .filter((request): request is CommunityRequest => request !== null);

    return [...incoming, ...outgoing];
  }, [connections.incoming, connections.outgoing]);

  const runAction = useCallback(
    async (action: () => Promise<{ ok: boolean; message: string }>) => {
      setPending(true);
      setFeedback(null);
      try {
        const result = await action();
        setFeedback({ type: result.ok ? 'success' : 'error', message: result.message });
        if (result.ok) {
          router.refresh();
          // Keep the client-side search result set in sync with the new state.
          if (searchQuery.trim()) setSearchVersion((version) => version + 1);
        }
      } catch {
        setFeedback({ type: 'error', message: 'Something went wrong. Please try again.' });
      } finally {
        setPending(false);
      }
    },
    [router, searchQuery]
  );

  const handleAddFriend = useCallback(
    (memberId: string) => {
      if (pending) return;
      void runAction(() => sendFriendRequest(memberId));
    },
    [pending, runAction]
  );

  const handleCancelRequest = useCallback(
    (memberId: string) => {
      if (pending) return;
      const connectionId = outgoingByMember.get(memberId);
      if (!connectionId) {
        setFeedback({ type: 'error', message: 'Could not find that pending request.' });
        return;
      }
      void runAction(() => cancelFriendRequest(connectionId));
    },
    [outgoingByMember, pending, runAction]
  );

  const handleAcceptRequest = useCallback(
    (requestId: string) => {
      if (pending) return;
      void runAction(() => acceptFriendRequest(requestId));
    },
    [pending, runAction]
  );

  const handleDeclineRequest = useCallback(
    (requestId: string) => {
      if (pending) return;
      void runAction(() => declineFriendRequest(requestId));
    },
    [pending, runAction]
  );

  const handleRemoveFriend = useCallback(
    (memberId: string) => {
      if (pending) return;
      const connectionId = friendsByMember.get(memberId);
      if (!connectionId) {
        setFeedback({ type: 'error', message: 'Could not find that connection.' });
        return;
      }
      void runAction(() => removeFriend(connectionId));
    },
    [friendsByMember, pending, runAction]
  );

  const handleViewProfile = useCallback(
    (username: string) => {
      router.push(`/u/${username}`);
    },
    [router]
  );

  const handleNavigate = useCallback(
    (section: CommunitySection) => {
      if (section === 'community') return;
      router.push(`/${section}`);
    },
    [router]
  );

  const handleSignOut = useCallback(() => {
    void signOutAction();
  }, [signOutAction]);

  const hasQuery = searchQuery.trim().length > 0;
  const members = hasQuery
    ? searchResults.map((user) => userToMember(user))
    : discoveryMembers;
  const activeFeedback =
    feedback ?? (searchError ? { type: 'error' as const, message: searchError } : null);

  return (
    <RootRealmCommunity
      currentUser={{
        id: currentUserId,
        displayName: currentDisplayName || currentUsername,
        username: currentUsername,
        initials: initialOf(currentDisplayName || currentUsername),
        avatarUrl: currentAvatarUrl,
        level: currentLevel,
      }}
      members={members}
      memberCount={discoveryMembers.length}
      friends={friends}
      requests={requests}
      searchQuery={searchQuery}
      onSearchQueryChange={setSearchQuery}
      searching={isSearching}
      feedback={activeFeedback}
      onNavigate={handleNavigate}
      onViewProfile={handleViewProfile}
      onAddFriend={handleAddFriend}
      onCancelRequest={handleCancelRequest}
      onAcceptRequest={handleAcceptRequest}
      onDeclineRequest={handleDeclineRequest}
      onRemoveFriend={handleRemoveFriend}
      onSignOut={handleSignOut}
    />
  );
}

export default CommunityView;