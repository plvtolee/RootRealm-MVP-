import { redirect } from 'next/navigation';

/**
 * The Friends destination was renamed to Community in Phase 3.
 * Keep the old URL working so existing bookmarks and links do not break.
 */
export default function FriendsPage() {
  redirect('/community');
}