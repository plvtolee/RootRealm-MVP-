-- RootRealm Phase 3 — Social Discovery System
-- Migration: 005_user_connections
-- Adds mutual connection system, profile visibility, and public profile access.

-- ============================================================
-- 1. Profile visibility setting
-- ============================================================
alter table public.profiles
  add column if not exists visibility text not null default 'public'
    check (visibility in ('public', 'private')),
  add column if not exists display_name text;

-- Backfill display_name from username for existing users
update public.profiles
set display_name = username
where display_name is null;

-- Index for public profile lookups
create index if not exists profiles_username_idx on public.profiles(username);
create index if not exists profiles_visibility_idx on public.profiles(visibility) where visibility = 'public';

-- ============================================================
-- 2. User Connections Table
-- ============================================================
create table if not exists public.user_connections (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Prevent self-connections
  constraint user_connections_no_self check (requester_id <> recipient_id)
);

-- Prevent duplicate relationships in either direction (A->B or B->A)
-- Using a unique index with expressions since least()/greatest() can't be used in a constraint
create unique index if not exists user_connections_unique_pair
  on public.user_connections (least(requester_id, recipient_id), greatest(requester_id, recipient_id));

-- Indexes for efficient lookups
create index if not exists user_connections_requester_idx on public.user_connections(requester_id);
create index if not exists user_connections_recipient_idx on public.user_connections(recipient_id);
create index if not exists user_connections_status_idx on public.user_connections(status);

-- ============================================================
-- 3. Triggers
-- ============================================================
drop trigger if exists user_connections_set_updated_at on public.user_connections;
create trigger user_connections_set_updated_at
  before update on public.user_connections
  for each row execute function public.set_updated_at();

-- ============================================================
-- 4. Row Level Security
-- ============================================================
alter table public.user_connections enable row level security;

-- Users can read connections they are part of
drop policy if exists user_connections_select_involved on public.user_connections;
create policy user_connections_select_involved
  on public.user_connections for select
  using (
    auth.uid() = requester_id
    or auth.uid() = recipient_id
  );

-- Users can create outgoing requests (as requester)
drop policy if exists user_connections_insert_own on public.user_connections;
create policy user_connections_insert_own
  on public.user_connections for insert
  with check (
    auth.uid() = requester_id
    and auth.uid() <> recipient_id
    and status = 'pending'
  );

-- Users can update their own outgoing requests (cancel) or incoming requests (accept/decline)
drop policy if exists user_connections_update_involved on public.user_connections;
create policy user_connections_update_involved
  on public.user_connections for update
  using (
    auth.uid() = requester_id or auth.uid() = recipient_id
  )
  with check (
    -- Requester can only cancel (set to declined)
    (auth.uid() = requester_id and status = 'declined')
    -- Recipient can accept or decline
    or (auth.uid() = recipient_id and status in ('accepted', 'declined'))
    -- No other transitions allowed
  );

-- Users can delete their own accepted connections (remove friend)
-- or cancel their own pending outgoing requests
drop policy if exists user_connections_delete_involved on public.user_connections;
create policy user_connections_delete_involved
  on public.user_connections for delete
  using (
    (auth.uid() = requester_id and status = 'pending')
    or (auth.uid() = requester_id and status = 'accepted')
    or (auth.uid() = recipient_id and status = 'accepted')
  );

-- ============================================================
-- 5. Privileges: no direct client writes beyond RLS
-- ============================================================
revoke all on public.user_connections from anon, authenticated;
grant select, insert, update, delete on public.user_connections to authenticated;

-- ============================================================
-- 6. Secure Server-Side Functions for Connection Operations
-- ============================================================

-- Send a friend request
create or replace function public.send_friend_request(p_recipient_id uuid)
returns table (
  connection_id uuid,
  status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_requester_id uuid := auth.uid();
  v_connection public.user_connections%rowtype;
begin
  if v_requester_id is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  if v_requester_id = p_recipient_id then
    raise exception 'Cannot send request to yourself' using errcode = 'P0001';
  end if;

  -- Check if recipient exists and has a profile
  if not exists (select 1 from public.profiles where id = p_recipient_id) then
    raise exception 'User not found' using errcode = 'P0002';
  end if;

  -- Try to insert the connection
  begin
    insert into public.user_connections (requester_id, recipient_id, status)
    values (v_requester_id, p_recipient_id, 'pending')
    returning id, status into v_connection.id, v_connection.status;
  exception
    when unique_violation then
      -- Connection already exists in some state; fetch it
      select * into v_connection
      from public.user_connections
      where (requester_id = v_requester_id and recipient_id = p_recipient_id)
         or (requester_id = p_recipient_id and recipient_id = v_requester_id);

      if v_connection.status = 'pending' then
        raise exception 'Friend request already sent' using errcode = '23505';
      elsif v_connection.status = 'accepted' then
        raise exception 'Already friends' using errcode = '23505';
      elsif v_connection.status = 'declined' then
        -- Allow re-requesting after a decline by updating to pending
        update public.user_connections
        set status = 'pending',
            requester_id = v_requester_id,
            recipient_id = p_recipient_id,
            updated_at = now()
        where id = v_connection.id
        returning id, status into v_connection.id, v_connection.status;
      end if;
  end;

  connection_id := v_connection.id;
  status := v_connection.status;
  return next;
end;
$$;

-- Accept an incoming friend request
create or replace function public.accept_friend_request(p_connection_id uuid)
returns table (
  connection_id uuid,
  status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_connection public.user_connections%rowtype;
begin
  if v_user_id is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  select * into v_connection
  from public.user_connections
  where id = p_connection_id;

  if not found then
    raise exception 'Connection not found' using errcode = 'P0002';
  end if;

  if v_connection.recipient_id <> v_user_id then
    raise exception 'Not authorized to accept this request' using errcode = '42501';
  end if;

  if v_connection.status <> 'pending' then
    raise exception 'Request is not pending' using errcode = 'P0001';
  end if;

  update public.user_connections
  set status = 'accepted', updated_at = now()
  where id = p_connection_id
  returning id, status into v_connection.id, v_connection.status;

  connection_id := v_connection.id;
  status := v_connection.status;
  return next;
end;
$$;

-- Decline an incoming friend request
create or replace function public.decline_friend_request(p_connection_id uuid)
returns table (
  connection_id uuid,
  status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_connection public.user_connections%rowtype;
begin
  if v_user_id is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  select * into v_connection
  from public.user_connections
  where id = p_connection_id;

  if not found then
    raise exception 'Connection not found' using errcode = 'P0002';
  end if;

  if v_connection.recipient_id <> v_user_id then
    raise exception 'Not authorized to decline this request' using errcode = '42501';
  end if;

  if v_connection.status <> 'pending' then
    raise exception 'Request is not pending' using errcode = 'P0001';
  end if;

  update public.user_connections
  set status = 'declined', updated_at = now()
  where id = p_connection_id
  returning id, status into v_connection.id, v_connection.status;

  connection_id := v_connection.id;
  status := v_connection.status;
  return next;
end;
$$;

-- Cancel an outgoing friend request
create or replace function public.cancel_friend_request(p_connection_id uuid)
returns table (
  connection_id uuid,
  status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_connection public.user_connections%rowtype;
begin
  if v_user_id is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  select * into v_connection
  from public.user_connections
  where id = p_connection_id;

  if not found then
    raise exception 'Connection not found' using errcode = 'P0002';
  end if;

  if v_connection.requester_id <> v_user_id then
    raise exception 'Not authorized to cancel this request' using errcode = '42501';
  end if;

  if v_connection.status <> 'pending' then
    raise exception 'Request is not pending' using errcode = 'P0001';
  end if;

  update public.user_connections
  set status = 'declined', updated_at = now()
  where id = p_connection_id
  returning id, status into v_connection.id, v_connection.status;

  connection_id := v_connection.id;
  status := v_connection.status;
  return next;
end;
$$;

-- Remove an accepted friend connection
create or replace function public.remove_friend(p_connection_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_connection public.user_connections%rowtype;
begin
  if v_user_id is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  select * into v_connection
  from public.user_connections
  where id = p_connection_id;

  if not found then
    raise exception 'Connection not found' using errcode = 'P0002';
  end if;

  if v_connection.requester_id <> v_user_id
     and v_connection.recipient_id <> v_user_id then
    raise exception 'Not authorized to remove this connection' using errcode = '42501';
  end if;

  if v_connection.status <> 'accepted' then
    raise exception 'Connection is not accepted' using errcode = 'P0001';
  end if;

  delete from public.user_connections
  where id = p_connection_id;
end;
$$;

-- ============================================================
-- 7. Function Privileges
-- ============================================================
revoke all on function public.send_friend_request(uuid) from public, anon;
revoke all on function public.accept_friend_request(uuid) from public, anon;
revoke all on function public.decline_friend_request(uuid) from public, anon;
revoke all on function public.cancel_friend_request(uuid) from public, anon;
revoke all on function public.remove_friend(uuid) from public, anon;

grant execute on function public.send_friend_request(uuid) to authenticated;
grant execute on function public.accept_friend_request(uuid) to authenticated;
grant execute on function public.decline_friend_request(uuid) to authenticated;
grant execute on function public.cancel_friend_request(uuid) to authenticated;
grant execute on function public.remove_friend(uuid) to authenticated;

-- ============================================================
-- 8. Public Profile Access Function
-- ============================================================
create or replace function public.get_public_profile(p_username text)
returns table (
  id uuid,
  username text,
  display_name text,
  avatar_url text,
  total_xp integer,
  coins integer,
  equipped_cosmetic_id uuid,
  created_at timestamptz,
  visibility text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_viewer_id uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_equipped_cosmetic public.cosmetics%rowtype;
begin
  select * into v_profile
  from public.profiles
  where username = p_username;

  if not found then
    raise exception 'User not found' using errcode = 'P0002';
  end if;

  if v_profile.visibility = 'private' then
    if v_viewer_id is null or v_viewer_id <> v_profile.id then
      raise exception 'Profile is private' using errcode = '42501';
    end if;
  end if;

  -- Don't expose coins to other users
  if v_viewer_id is not null and v_viewer_id = v_profile.id then
    return query select v_profile.id, v_profile.username, v_profile.display_name,
      v_profile.avatar_url, v_profile.total_xp, v_profile.coins,
      v_profile.equipped_cosmetic_id, v_profile.created_at, v_profile.visibility;
  else
    return query select v_profile.id, v_profile.username, v_profile.display_name,
      v_profile.avatar_url, v_profile.total_xp, 0 as coins,
      v_profile.equipped_cosmetic_id, v_profile.created_at, v_profile.visibility;
  end if;
end;
$$;

revoke all on function public.get_public_profile(text) from public, anon;
grant execute on function public.get_public_profile(text) to authenticated, anon;

-- ============================================================
-- 9. Public Profile Stats Function
-- ============================================================
create or replace function public.get_public_profile_stats(p_user_id uuid)
returns table (
  quests_completed integer,
  total_xp integer,
  level integer,
  commits integer,
  merged_prs integer,
  repositories integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_completions integer;
  v_total_xp integer;
  v_commits integer;
  v_prs integer;
  v_repos integer;
begin
  select count(*) into v_completions
  from public.quest_completions
  where user_id = p_user_id;

  select total_xp into v_total_xp
  from public.profiles
  where id = p_user_id;

  select count(*) into v_commits
  from public.github_activity_events
  where user_id = p_user_id and activity_type = 'commit';

  select count(*) into v_prs
  from public.github_activity_events
  where user_id = p_user_id and activity_type = 'merged_pr';

  select count(distinct repo_full_name) into v_repos
  from public.github_activity_events
  where user_id = p_user_id;

  return query select v_completions, v_total_xp,
    floor(v_total_xp / 100) + 1 as level,
    v_commits, v_prs, v_repos;
end;
$$;

revoke all on function public.get_public_profile_stats(uuid) from public, anon;
grant execute on function public.get_public_profile_stats(uuid) to authenticated, anon;