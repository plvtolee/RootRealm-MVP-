import 'server-only';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type {
  Connection,
  ConnectionStatus,
  PublicCosmetic,
  PublicProfile,
  PublicProfileStats,
  PublicProfileWithStats,
  SearchUsersParams,
  SearchUsersResult,
  UserSearchResult,
} from '@/lib/types';

const DEFAULT_SEARCH_LIMIT = 20;

/**
 * Search RootRealm users by username or display name.
 * Excludes the current user and only returns public profiles.
 */
export async function searchUsers(params: SearchUsersParams): Promise<SearchUsersResult> {
  const supabase = createClient();
  // Profile rows are protected by an owner-only RLS policy, so cross-user reads
  // for discovery/search go through the service-role client (server-only) which
  // selects only non-sensitive columns and still filters on public visibility.
  const admin = createAdminClient();
  const { query, limit = DEFAULT_SEARCH_LIMIT, offset = 0 } = params;

  if (!query.trim()) {
    return { users: [], total: 0, hasMore: false };
  }

  const { data: { user: currentUser } } = await supabase.auth.getUser();
  const currentUserId = currentUser?.id;

  // Search by username or display_name with trigram similarity would be ideal,
  // but for MVP we use ILIKE with wildcards.
  const searchTerm = `%${query.trim()}%`;

  const { data, error, count } = await admin
    .from('profiles')
    .select('id, username, display_name, avatar_url, total_xp, created_at', { count: 'exact' })
    .eq('visibility', 'public')
    .or(`username.ilike.${searchTerm},display_name.ilike.${searchTerm}`)
    .order('total_xp', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw new Error(error.message);

  const profiles = (data ?? []) as Array<{
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
    total_xp: number;
    created_at: string;
  }>;

  // Get connection statuses for all results in one query
  const userIds = profiles.map((p) => p.id);
  const connectionMap = await getConnectionStatusMap(currentUserId!, userIds);

  const users: UserSearchResult[] = profiles.map((profile) => {
    const level = Math.floor(profile.total_xp / 100) + 1;
    const conn = connectionMap.get(profile.id);

    return {
      id: profile.id,
      username: profile.username,
      display_name: profile.display_name ?? profile.username,
      avatar_url: profile.avatar_url,
      total_xp: profile.total_xp,
      level,
      connection_status: conn?.status ?? 'none',
      connection_id: conn?.id ?? null,
    };
  });

  return {
    users,
    total: count ?? 0,
    hasMore: offset + users.length < (count ?? 0),
  };
}

/**
 * Get connection statuses between current user and a list of target users.
 */
async function getConnectionStatusMap(
  currentUserId: string | undefined,
  targetUserIds: string[]
): Promise<Map<string, { status: ConnectionStatus; id: string }>> {
  if (!currentUserId || targetUserIds.length === 0) {
    return new Map();
  }

  const supabase = createClient();
  const targets = new Set(targetUserIds);

  // Fetch the current user's connections and filter to the requested targets.
  // Building a nested OR tree per target misuses PostgREST's logic-tree syntax,
  // so we scope the query by the current user and filter client-side.
  const { data, error } = await supabase
    .from('user_connections')
    .select('id, requester_id, recipient_id, status')
    .or(`requester_id.eq.${currentUserId},recipient_id.eq.${currentUserId}`);

  if (error) throw new Error(error.message);

  const map = new Map<string, { status: ConnectionStatus; id: string }>();

  for (const conn of data ?? []) {
    const otherId = conn.requester_id === currentUserId ? conn.recipient_id : conn.requester_id;

    if (!targets.has(otherId)) continue;

    let status: ConnectionStatus;

    if (conn.status === 'accepted') {
      status = 'accepted';
    } else if (conn.status === 'pending') {
      status = conn.requester_id === currentUserId ? 'pending_outgoing' : 'pending_incoming';
    } else {
      status = 'none';
    }

    map.set(otherId, { status, id: conn.id });
  }

  return map;
}

/**
 * Get a public profile by username with connection status.
 */
export async function getPublicProfile(username: string): Promise<PublicProfileWithStats | null> {
  const supabase = createClient();
  const { data: { user: currentUser } } = await supabase.auth.getUser();
  const currentUserId = currentUser?.id;

  // Call the secure server function (repaired in migration 006 — it previously
  // raised "column reference \"username\" is ambiguous").
  const { data, error } = await supabase.rpc('get_public_profile', { p_username: username });

  if (error) {
    if (error.code === 'P0002' || error.code === '42501') {
      return null;
    }
    throw new Error(error.message);
  }

  if (!data || data.length === 0) {
    return null;
  }

  const profile = data[0] as PublicProfile;

  // New accounts may not have a display_name yet; fall back to username so
  // consumers never receive null.
  const displayName = profile.display_name ?? profile.username;

  // The profile row stores only the equipped cosmetic's id; resolve its display
  // details so the UI can show a name/accent instead of the raw uuid.
  let equipped_cosmetic: PublicCosmetic | null = null;
  if (profile.equipped_cosmetic_id) {
    const { data: cosmetic } = await supabase
      .from('cosmetics')
      .select('id, name, cosmetic_type, preview_value')
      .eq('id', profile.equipped_cosmetic_id)
      .maybeSingle();
    equipped_cosmetic = (cosmetic as PublicCosmetic | null) ?? null;
  }

  // Get stats
  const { data: statsData, error: statsError } = await supabase.rpc('get_public_profile_stats', {
    p_user_id: profile.id,
  });

  if (statsError) throw new Error(statsError.message);

  const stats = (statsData?.[0] ?? {}) as PublicProfileStats;

  // Get connection status if authenticated
  let connection_status: ConnectionStatus = 'none';
  let connection_id: string | null = null;

  if (currentUserId && currentUserId !== profile.id) {
    const { data: connData } = await supabase
      .from('user_connections')
      .select('id, requester_id, status')
      .or(
        `and(requester_id.eq.${currentUserId},recipient_id.eq.${profile.id}),and(requester_id.eq.${profile.id},recipient_id.eq.${currentUserId})`
      )
      .maybeSingle();

    if (connData) {
      connection_id = connData.id;
      if (connData.status === 'accepted') {
        connection_status = 'accepted';
      } else if (connData.status === 'pending') {
        connection_status = connData.requester_id === currentUserId ? 'pending_outgoing' : 'pending_incoming';
      }
    }
  }

  return {
    ...profile,
    display_name: displayName,
    stats,
    equipped_cosmetic,
    connection_status,
    connection_id,
  } as PublicProfileWithStats;
}

/**
 * Get recently joined public profiles.
 */
export async function getRecentlyJoined(limit = 10, excludeUserId?: string): Promise<UserSearchResult[]> {
  const admin = createAdminClient();

  let query = admin
    .from('profiles')
    .select('id, username, display_name, avatar_url, total_xp, created_at')
    .eq('visibility', 'public')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (excludeUserId) {
    query = query.neq('id', excludeUserId);
  }

  const { data, error } = await query;

  if (error) throw new Error(error.message);

  const profiles = (data ?? []) as Array<{
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
    total_xp: number;
    created_at: string;
  }>;

  // Get connection statuses
  const userIds = profiles.map((p) => p.id);
  const currentUserId = excludeUserId;
  const connectionMap = await getConnectionStatusMap(currentUserId, userIds);

  return profiles.map((profile) => {
    const level = Math.floor(profile.total_xp / 100) + 1;
    const conn = connectionMap.get(profile.id);

    return {
      id: profile.id,
      username: profile.username,
      display_name: profile.display_name ?? profile.username,
      avatar_url: profile.avatar_url,
      total_xp: profile.total_xp,
      level,
      connection_status: conn?.status ?? 'none',
      connection_id: conn?.id ?? null,
    };
  });
}

/**
 * Get top developers by XP.
 */
export async function getTopDevelopers(limit = 10, excludeUserId?: string): Promise<UserSearchResult[]> {
  const admin = createAdminClient();

  let query = admin
    .from('profiles')
    .select('id, username, display_name, avatar_url, total_xp, created_at')
    .eq('visibility', 'public')
    .order('total_xp', { ascending: false })
    .limit(limit);

  if (excludeUserId) {
    query = query.neq('id', excludeUserId);
  }

  const { data, error } = await query;

  if (error) throw new Error(error.message);

  const profiles = (data ?? []) as Array<{
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
    total_xp: number;
    created_at: string;
  }>;

  const userIds = profiles.map((p) => p.id);
  const connectionMap = await getConnectionStatusMap(excludeUserId, userIds);

  return profiles.map((profile) => {
    const level = Math.floor(profile.total_xp / 100) + 1;
    const conn = connectionMap.get(profile.id);

    return {
      id: profile.id,
      username: profile.username,
      display_name: profile.display_name ?? profile.username,
      avatar_url: profile.avatar_url,
      total_xp: profile.total_xp,
      level,
      connection_status: conn?.status ?? 'none',
      connection_id: conn?.id ?? null,
    };
  });
}

/**
 * Get suggested developers (not connected, public).
 */
export async function getSuggestedDevelopers(limit = 10, excludeUserId?: string): Promise<UserSearchResult[]> {
  const supabase = createClient();
  const admin = createAdminClient();

  // Get IDs of users already connected to or requested
  let connectedIds: string[] = [];
  if (excludeUserId) {
    const { data: connections } = await supabase
      .from('user_connections')
      .select('requester_id, recipient_id')
      .or(`requester_id.eq.${excludeUserId},recipient_id.eq.${excludeUserId}`)
      .in('status', ['pending', 'accepted']);

    if (connections) {
      connectedIds = connections.flatMap((c) =>
        c.requester_id === excludeUserId ? [c.recipient_id] : [c.requester_id]
      );
    }
  }

  let query = admin
    .from('profiles')
    .select('id, username, display_name, avatar_url, total_xp, created_at')
    .eq('visibility', 'public')
    .order('total_xp', { ascending: false })
    .limit(limit + connectedIds.length + 1); // Fetch extra to account for filtering

  if (excludeUserId) {
    query = query.neq('id', excludeUserId);
  }

  if (connectedIds.length > 0) {
    query = query.not('id', 'in', `(${connectedIds.join(',')})`);
  }

  const { data, error } = await query;

  if (error) throw new Error(error.message);

  const profiles = ((data ?? []) as Array<{
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
    total_xp: number;
    created_at: string;
  }>).slice(0, limit);

  const userIds = profiles.map((p) => p.id);
  const connectionMap = await getConnectionStatusMap(excludeUserId, userIds);

  return profiles.map((profile) => {
    const level = Math.floor(profile.total_xp / 100) + 1;
    const conn = connectionMap.get(profile.id);

    return {
      id: profile.id,
      username: profile.username,
      display_name: profile.display_name ?? profile.username,
      avatar_url: profile.avatar_url,
      total_xp: profile.total_xp,
      level,
      connection_status: conn?.status ?? 'none',
      connection_id: conn?.id ?? null,
    };
  });
}

/**
 * Get all connections for the current user.
 */
export async function getUserConnections(userId: string): Promise<{
  friends: Connection[];
  incoming: Connection[];
  outgoing: Connection[];
}> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('user_connections')
    .select('id, requester_id, recipient_id, status, created_at, updated_at')
    .or(`requester_id.eq.${userId},recipient_id.eq.${userId}`)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  const connections = (data ?? []) as Array<{
    id: string;
    requester_id: string;
    recipient_id: string;
    status: 'pending' | 'accepted' | 'declined';
    created_at: string;
    updated_at: string;
  }>;

  // Get other user info for each connection
  const otherIds = Array.from(
    new Set(connections.flatMap((c) =>
      c.requester_id === userId ? [c.recipient_id] : [c.requester_id]
    ))
  );

  const admin = createAdminClient();
  const { data: profiles } = await admin
    .from('profiles')
    .select('id, username, display_name, avatar_url, total_xp')
    .in('id', otherIds);

  const profileMap = new Map(
    (profiles ?? []).map((p) => [p.id, p])
  );

  const friends: Connection[] = [];
  const incoming: Connection[] = [];
  const outgoing: Connection[] = [];

  for (const conn of connections) {
    const otherId = conn.requester_id === userId ? conn.recipient_id : conn.requester_id;
    const otherProfile = profileMap.get(otherId);

    const baseConnection: Connection = {
      id: conn.id,
      requester_id: conn.requester_id,
      recipient_id: conn.recipient_id,
      status: conn.status,
      created_at: conn.created_at,
      updated_at: conn.updated_at,
      other_user: otherProfile
        ? {
            id: otherProfile.id,
            username: otherProfile.username,
            display_name: otherProfile.display_name ?? otherProfile.username,
            avatar_url: otherProfile.avatar_url,
            total_xp: otherProfile.total_xp,
            level: Math.floor(otherProfile.total_xp / 100) + 1,
            connection_status: 'accepted',
            connection_id: conn.id,
          }
        : undefined,
    };

    if (conn.status === 'accepted') {
      friends.push(baseConnection);
    } else if (conn.status === 'pending') {
      if (conn.recipient_id === userId) {
        incoming.push(baseConnection);
      } else {
        outgoing.push(baseConnection);
      }
    }
  }

  return { friends, incoming, outgoing };
}