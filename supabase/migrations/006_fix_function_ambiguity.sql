-- RootRealm Phase 3 — Fix PL/pgSQL name collisions in connection & profile functions
-- Migration: 006_fix_function_ambiguity
--
-- Several functions added in 005 declare RETURNS TABLE output columns whose
-- names match real table columns referenced inside the function body
-- (e.g. `status` vs user_connections.status, `username` vs profiles.username,
-- `total_xp` vs profiles.total_xp). PL/pgSQL's default
-- `plpgsql.variable_conflict = error` therefore raises
--   "column reference \"...\" is ambiguous"
-- at runtime, which broke sending/accepting/declining/cancelling friend
-- requests and loading public profiles.
--
-- This migration redefines only the affected function BODIES, adding the
-- `#variable_conflict use_column` directive so ambiguous names resolve to the
-- table column (the intended meaning). No tables, RLS policies, indexes, or
-- grants are changed.

-- ============================================================
-- 1. Connection functions
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
#variable_conflict use_column
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
#variable_conflict use_column
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
#variable_conflict use_column
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
#variable_conflict use_column
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

-- ============================================================
-- 2. Public profile functions
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
#variable_conflict use_column
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
#variable_conflict use_column
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

-- ============================================================
-- 3. Re-affirm function privileges (create or replace preserves them;
--    restated here for an explicit, self-contained migration)
-- ============================================================
revoke all on function public.send_friend_request(uuid) from public, anon;
revoke all on function public.accept_friend_request(uuid) from public, anon;
revoke all on function public.decline_friend_request(uuid) from public, anon;
revoke all on function public.cancel_friend_request(uuid) from public, anon;

grant execute on function public.send_friend_request(uuid) to authenticated;
grant execute on function public.accept_friend_request(uuid) to authenticated;
grant execute on function public.decline_friend_request(uuid) to authenticated;
grant execute on function public.cancel_friend_request(uuid) to authenticated;

revoke all on function public.get_public_profile(text) from public, anon;
grant execute on function public.get_public_profile(text) to authenticated, anon;

revoke all on function public.get_public_profile_stats(uuid) from public, anon;
grant execute on function public.get_public_profile_stats(uuid) to authenticated, anon;
