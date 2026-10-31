/**
 * Phase 3 presentation types for Social Discovery UI.
 */

export type ConnectionUIStatus = 'none' | 'pending_outgoing' | 'pending_incoming' | 'accepted';

export interface UserCardData {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  total_xp: number;
  level: number;
  connection_status: ConnectionUIStatus;
  connection_id: string | null;
}

export interface PublicProfileData {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  total_xp: number;
  coins: number;
  equipped_cosmetic_id: string | null;
  equipped_cosmetic: {
    id: string;
    name: string;
    cosmetic_type: string;
    preview_value: string;
  } | null;
  created_at: string;
  visibility: 'public' | 'private';
  stats: {
    quests_completed: number;
    total_xp: number;
    level: number;
    commits: number;
    merged_prs: number;
    repositories: number;
  };
  connection_status: ConnectionUIStatus;
  connection_id: string | null;
}

export interface ConnectionData {
  id: string;
  requester_id: string;
  recipient_id: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
  updated_at: string;
  other_user?: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
    total_xp: number;
    level: number;
    connection_status: ConnectionUIStatus;
    connection_id: string;
  };
}

export interface ConnectionsData {
  friends: ConnectionData[];
  incoming: ConnectionData[];
  outgoing: ConnectionData[];
}

export interface SearchState {
  query: string;
  isLoading: boolean;
  users: UserCardData[];
  hasMore: boolean;
  error: string | null;
}

export interface DiscoverSection {
  id: string;
  title: string;
  users: UserCardData[];
}