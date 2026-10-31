'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export interface SocialActionResult<T = void> {
  ok: boolean;
  message: string;
  data?: T;
}

/**
 * Send a friend request to another user.
 */
export async function sendFriendRequest(recipientId: string): Promise<SocialActionResult<{ connectionId: string }>> {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, message: 'Not authenticated' };
  }

  if (user.id === recipientId) {
    return { ok: false, message: 'You cannot send a friend request to yourself' };
  }

  // Recipient existence is validated inside the SECURITY DEFINER RPC, which
  // raises P0002 when the profile does not exist. A direct client read of the
  // recipient's profile is blocked by the owner-only RLS policy.
  const { data, error } = await supabase.rpc('send_friend_request', { p_recipient_id: recipientId });

  if (error) {
    if (error.code === 'P0002') {
      return { ok: false, message: 'User not found' };
    }
    if (error.code === '23505') {
      // Check what the existing state is
      const { data: existing } = await supabase
        .from('user_connections')
        .select('status')
        .or(`and(requester_id.eq.${user.id},recipient_id.eq.${recipientId}),and(requester_id.eq.${recipientId},recipient_id.eq.${user.id})`)
        .maybeSingle();

      if (existing?.status === 'pending') {
        return { ok: false, message: 'Friend request already sent' };
      }
      if (existing?.status === 'accepted') {
        return { ok: false, message: 'You are already friends' };
      }
      // If declined, the RPC allows re-requesting
    }
    return { ok: false, message: error.message || 'Failed to send friend request' };
  }

  revalidatePath('/community');
  revalidatePath('/friends');
  revalidatePath(`/u/${recipientId}`);

  return { ok: true, message: 'Friend request sent', data: { connectionId: data[0].connection_id } };
}

/**
 * Accept an incoming friend request.
 */
export async function acceptFriendRequest(connectionId: string): Promise<SocialActionResult<{ connectionId: string }>> {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, message: 'Not authenticated' };
  }

  const { data, error } = await supabase.rpc('accept_friend_request', { p_connection_id: connectionId });

  if (error) {
    return { ok: false, message: error.message || 'Failed to accept friend request' };
  }

  revalidatePath('/friends');
  revalidatePath('/community');

  return { ok: true, message: 'Friend request accepted', data: { connectionId: data[0].connection_id } };
}

/**
 * Decline an incoming friend request.
 */
export async function declineFriendRequest(connectionId: string): Promise<SocialActionResult<{ connectionId: string }>> {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, message: 'Not authenticated' };
  }

  const { data, error } = await supabase.rpc('decline_friend_request', { p_connection_id: connectionId });

  if (error) {
    return { ok: false, message: error.message || 'Failed to decline friend request' };
  }

  revalidatePath('/friends');
  revalidatePath('/community');

  return { ok: true, message: 'Friend request declined', data: { connectionId: data[0].connection_id } };
}

/**
 * Cancel an outgoing friend request.
 */
export async function cancelFriendRequest(connectionId: string): Promise<SocialActionResult<{ connectionId: string }>> {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, message: 'Not authenticated' };
  }

  const { data, error } = await supabase.rpc('cancel_friend_request', { p_connection_id: connectionId });

  if (error) {
    return { ok: false, message: error.message || 'Failed to cancel friend request' };
  }

  revalidatePath('/friends');
  revalidatePath('/community');

  return { ok: true, message: 'Friend request cancelled', data: { connectionId: data[0].connection_id } };
}

/**
 * Remove an accepted friend connection.
 */
export async function removeFriend(connectionId: string): Promise<SocialActionResult<void>> {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, message: 'Not authenticated' };
  }

  const { error } = await supabase.rpc('remove_friend', { p_connection_id: connectionId });

  if (error) {
    return { ok: false, message: error.message || 'Failed to remove friend' };
  }

  revalidatePath('/friends');
  revalidatePath('/community');

  return { ok: true, message: 'Friend removed' };
}

/**
 * Update profile visibility (public/private).
 */
export async function updateProfileVisibility(visibility: 'public' | 'private'): Promise<SocialActionResult<void>> {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, message: 'Not authenticated' };
  }

  const { error } = await supabase
    .from('profiles')
    .update({ visibility })
    .eq('id', user.id);

  if (error) {
    return { ok: false, message: error.message || 'Failed to update visibility' };
  }

  revalidatePath('/profile');
  revalidatePath('/settings');

  return { ok: true, message: 'Profile visibility updated' };
}

/**
 * Update display name.
 */
export async function updateDisplayName(displayName: string): Promise<SocialActionResult<void>> {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, message: 'Not authenticated' };
  }

  // Validate display name
  const trimmed = displayName.trim();
  if (trimmed.length === 0) {
    return { ok: false, message: 'Display name cannot be empty' };
  }
  if (trimmed.length > 30) {
    return { ok: false, message: 'Display name must be 30 characters or less' };
  }

  const { error } = await supabase
    .from('profiles')
    .update({ display_name: trimmed })
    .eq('id', user.id);

  if (error) {
    return { ok: false, message: error.message || 'Failed to update display name' };
  }

  revalidatePath('/profile');
  revalidatePath('/settings');

  return { ok: true, message: 'Display name updated' };
}