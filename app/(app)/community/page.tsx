import { requireSession } from '@/lib/auth/session';
import { signOut } from '@/lib/auth/actions';
import {
  getUserConnections,
  getRecentlyJoined,
  getTopDevelopers,
  getSuggestedDevelopers,
} from '@/lib/social/queries';
import { CommunityView } from '@/components/phase3/CommunityView';
import type { ConnectionData } from '@/components/phase3/types';

export default async function CommunityPage() {
  const { profile } = await requireSession();

  const [connections, recentUsers, topUsers, suggestedUsers] = await Promise.all([
    getUserConnections(profile.id),
    getRecentlyJoined(12, profile.id),
    getTopDevelopers(12, profile.id),
    getSuggestedDevelopers(12, profile.id),
  ]);

  // Map the real connection rows into the presentation adapter's shape.
  const convertConnection = (conn: (typeof connections.friends)[number]): ConnectionData => ({
    id: conn.id,
    requester_id: conn.requester_id,
    recipient_id: conn.recipient_id,
    status: conn.status,
    created_at: conn.created_at,
    updated_at: conn.updated_at,
    other_user: conn.other_user
      ? {
          id: conn.other_user.id,
          username: conn.other_user.username,
          display_name: conn.other_user.display_name,
          avatar_url: conn.other_user.avatar_url,
          total_xp: conn.other_user.total_xp,
          level: conn.other_user.level,
          connection_status: conn.other_user.connection_status,
          connection_id: conn.other_user.connection_id ?? conn.id,
        }
      : undefined,
  });

  return (
    <CommunityView
      currentUserId={profile.id}
      currentUsername={profile.username}
      currentDisplayName={profile.display_name ?? profile.username}
      currentAvatarUrl={profile.avatar_url}
      currentLevel={Math.floor(profile.total_xp / 100) + 1}
      connections={{
        friends: connections.friends.map(convertConnection),
        incoming: connections.incoming.map(convertConnection),
        outgoing: connections.outgoing.map(convertConnection),
      }}
      recentUsers={recentUsers}
      topUsers={topUsers}
      suggestedUsers={suggestedUsers}
      signOutAction={signOut}
    />
  );
}