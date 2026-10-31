import { requireSession } from '@/lib/auth/session';
import { getPublicProfile } from '@/lib/social/queries';
import { PublicProfileView } from '@/components/phase3/PublicProfileView';
import { toPhase2Chrome } from '@/lib/phase2/adapters';
import { notFound } from 'next/navigation';

interface PublicProfilePageProps {
  params: Promise<{ username: string }>;
}

export default async function PublicProfilePage({ params }: PublicProfilePageProps) {
  const { profile: currentUserProfile } = await requireSession();
  const { username } = await params;

  const publicProfile = await getPublicProfile(username);

  if (!publicProfile) {
    notFound();
  }

  return (
    <PublicProfileView
      currentUserId={currentUserProfile.id}
      currentUserCoins={currentUserProfile.coins}
      currentUsername={currentUserProfile.username}
      currentAvatarUrl={currentUserProfile.avatar_url}
      publicProfile={publicProfile}
    />
  );
}