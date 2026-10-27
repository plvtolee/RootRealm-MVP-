-- RootRealm MVP — GitHub Activity Integration
-- Migration: 002_activity
-- Adds activity-driven quest rules, encrypted GitHub token storage,
-- normalized activity events, quest progress, sync runs, and the
-- SQL-authoritative evaluation functions.

-- ============================================================
-- 1. Quest rule fields
-- ============================================================
alter table public.quests
  add column if not exists activity_type text
    check (activity_type in ('commit', 'merged_pr')),
  add column if not exists requirement_count integer
    check (requirement_count > 0),
  add column if not exists window_days integer
    check (window_days is null or window_days > 0),
  add column if not exists exclude_merge_commits boolean not null default true,
  add column if not exists repo_filter text;

-- ============================================================
-- 2. Completion audit fields
-- ============================================================
alter table public.quest_completions
  add column if not exists source text not null default 'activity',
  add column if not exists evidence_count integer,
  add column if not exists progress_at_completion integer;

do $$
begin
  alter table public.quest_completions
    add constraint quest_completions_source_check
    check (source in ('activity'));
exception
  when duplicate_object then null;
end;
$$;

-- ============================================================
-- 3. New tables
-- ============================================================

-- Non-secret connection metadata for the authenticated GitHub user.
create table if not exists public.github_connections (
  user_id uuid primary key references auth.users(id) on delete cascade,
  github_login text not null,
  github_user_id bigint not null,
  scopes text[] not null default '{}',
  needs_reauth boolean not null default false,
  last_synced_at timestamptz,
  initial_sync_completed_at timestamptz,
  commits_history_complete boolean not null default false,
  prs_history_complete boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Encrypted GitHub token. Server-only: no RLS policies and no client grants.
create table if not exists public.github_oauth_tokens (
  user_id uuid primary key references public.github_connections(user_id) on delete cascade,
  ciphertext text not null,
  key_version smallint not null default 1,
  updated_at timestamptz not null default now()
);

-- Normalized, deduplicated activity.
create table if not exists public.github_activity_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  activity_type text not null check (activity_type in ('commit', 'merged_pr')),
  external_id text not null,
  repo_full_name text not null,
  occurred_at timestamptz not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, activity_type, external_id)
);

create index if not exists github_activity_events_user_type_time_idx
  on public.github_activity_events (user_id, activity_type, occurred_at desc);

-- Progress snapshot used by the UI.
create table if not exists public.quest_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  quest_id uuid not null references public.quests(id) on delete cascade,
  progress integer not null default 0 check (progress >= 0),
  target integer not null check (target > 0),
  status text not null default 'in_progress'
    check (status in ('in_progress', 'completed', 'indeterminate')),
  last_evaluated_at timestamptz not null default now(),
  unique (user_id, quest_id)
);

-- Observability for each user-triggered sync.
create table if not exists public.github_sync_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null
    check (status in ('success', 'partial', 'rate_limited', 'failed')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  commits_found integer not null default 0,
  prs_found integer not null default 0,
  events_inserted integer not null default 0,
  quests_completed integer not null default 0,
  truncated boolean not null default false,
  error_message text,
  rate_limit_remaining integer,
  rate_limit_reset_at timestamptz
);

-- ============================================================
-- 4. Triggers
-- ============================================================
drop trigger if exists github_connections_set_updated_at on public.github_connections;
create trigger github_connections_set_updated_at
  before update on public.github_connections
  for each row execute function public.set_updated_at();

-- ============================================================
-- 5. Row Level Security
-- ============================================================
alter table public.github_connections enable row level security;
alter table public.github_oauth_tokens enable row level security;
alter table public.github_activity_events enable row level security;
alter table public.quest_progress enable row level security;
alter table public.github_sync_runs enable row level security;

drop policy if exists github_connections_select_own on public.github_connections;
create policy github_connections_select_own
  on public.github_connections for select
  using (auth.uid() = user_id);

drop policy if exists github_activity_events_select_own on public.github_activity_events;
create policy github_activity_events_select_own
  on public.github_activity_events for select
  using (auth.uid() = user_id);

drop policy if exists quest_progress_select_own on public.quest_progress;
create policy quest_progress_select_own
  on public.quest_progress for select
  using (auth.uid() = user_id);

drop policy if exists github_sync_runs_select_own on public.github_sync_runs;
create policy github_sync_runs_select_own
  on public.github_sync_runs for select
  using (auth.uid() = user_id);

-- ============================================================
-- 6. Privileges: no direct client writes
-- ============================================================
revoke all on public.github_oauth_tokens from anon, authenticated;

revoke insert, update, delete on public.github_connections from anon, authenticated;
revoke insert, update, delete on public.github_activity_events from anon, authenticated;
revoke insert, update, delete on public.quest_progress from anon, authenticated;
revoke insert, update, delete on public.github_sync_runs from anon, authenticated;

grant select on public.github_connections to authenticated;
grant select on public.github_activity_events to authenticated;
grant select on public.quest_progress to authenticated;
grant select on public.github_sync_runs to authenticated;

-- ============================================================
-- 7. Functions (SQL-authoritative, atomic, secure)
-- ============================================================

-- Record normalized events for the authenticated user. Idempotent.
create or replace function public.record_activity_events(p_events jsonb)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_event jsonb;
  v_type text;
  v_external_id text;
  v_repo text;
  v_occurred timestamptz;
  v_metadata jsonb;
  v_inserted integer := 0;
  v_rows integer;
begin
  if v_user_id is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  if p_events is null or jsonb_typeof(p_events) <> 'array' then
    raise exception 'Events must be a JSON array' using errcode = '22023';
  end if;

  for v_event in select * from jsonb_array_elements(p_events)
  loop
    v_type := v_event->>'activityType';
    v_external_id := v_event->>'externalId';
    v_repo := v_event->>'repoFullName';

    if v_type is null or v_type not in ('commit', 'merged_pr') then
      continue;
    end if;
    if v_external_id is null or length(v_external_id) = 0
       or v_repo is null or length(v_repo) = 0 then
      continue;
    end if;

    begin
      v_occurred := (v_event->>'occurredAt')::timestamptz;
    exception
      when others then
        continue;
    end;

    if v_occurred is null then
      continue;
    end if;

    v_metadata := coalesce(v_event->'metadata', '{}'::jsonb);
    if jsonb_typeof(v_metadata) <> 'object' then
      v_metadata := '{}'::jsonb;
    end if;

    insert into public.github_activity_events
      (user_id, activity_type, external_id, repo_full_name, occurred_at, metadata)
    values
      (v_user_id, v_type, v_external_id, v_repo, v_occurred, v_metadata)
    on conflict (user_id, activity_type, external_id) do nothing;

    get diagnostics v_rows = row_count;
    v_inserted := v_inserted + v_rows;
  end loop;

  return v_inserted;
end;
$$;

-- Recompute progress and award eligible quests atomically.
create or replace function public.evaluate_activity_quests()
returns table (
  out_quest_id uuid,
  out_progress integer,
  out_target integer,
  out_status text,
  out_newly_completed boolean,
  out_xp_awarded integer,
  out_coins_awarded integer,
  out_new_total_xp integer,
  out_new_coins integer
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_quest record;
  v_count integer;
  v_status text;
  v_completed boolean;
  v_completion_id uuid;
  v_already boolean;
  v_xp integer;
  v_coins integer;
  v_new_xp integer;
  v_new_coins integer;
  v_initial_done boolean := false;
  v_commits_complete boolean := false;
  v_prs_complete boolean := false;
  v_history_complete boolean;
begin
  if v_user_id is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  select
    coalesce(initial_sync_completed_at is not null, false),
    coalesce(commits_history_complete, false),
    coalesce(prs_history_complete, false)
  into v_initial_done, v_commits_complete, v_prs_complete
  from public.github_connections
  where user_id = v_user_id;

  if not found then
    v_initial_done := false;
    v_commits_complete := false;
    v_prs_complete := false;
  end if;

  for v_quest in
    select q.*
    from public.quests q
    where q.is_active = true
      and q.activity_type is not null
      and q.requirement_count is not null
    order by q.difficulty, q.title
  loop
    v_completion_id := null;
    v_completed := false;
    v_xp := 0;
    v_coins := 0;
    v_new_xp := null;
    v_new_coins := null;

    select count(*) into v_count
    from public.github_activity_events e
    where e.user_id = v_user_id
      and e.activity_type = v_quest.activity_type
      and (
        v_quest.window_days is null
        or e.occurred_at >= now() - make_interval(days => v_quest.window_days)
      )
      and (v_quest.repo_filter is null or e.repo_full_name = v_quest.repo_filter)
      and not (e.metadata @> '{"isBot": true}'::jsonb)
      and not (
        v_quest.activity_type = 'commit'
        and v_quest.exclude_merge_commits
        and e.metadata @> '{"isMerge": true}'::jsonb
      );

    select exists (
      select 1 from public.quest_completions qc
      where qc.user_id = v_user_id and qc.quest_id = v_quest.id
    ) into v_already;

    if v_already then
      v_status := 'completed';
      v_count := greatest(v_count, v_quest.requirement_count);
    elsif v_count >= v_quest.requirement_count then
      v_status := 'completed';
    else
      if v_quest.activity_type = 'commit' then
        v_history_complete := v_commits_complete;
      else
        v_history_complete := v_prs_complete;
      end if;

      if v_initial_done
         and not v_history_complete
         and v_quest.requirement_count > v_count then
        v_status := 'indeterminate';
      else
        v_status := 'in_progress';
      end if;
    end if;

    insert into public.quest_progress
      (user_id, quest_id, progress, target, status, last_evaluated_at)
    values
      (v_user_id, v_quest.id, least(v_count, v_quest.requirement_count),
       v_quest.requirement_count, v_status, now())
    on conflict (user_id, quest_id) do update
      set progress = excluded.progress,
          target = excluded.target,
          status = excluded.status,
          last_evaluated_at = excluded.last_evaluated_at;

    if v_status = 'completed' and not v_already then
      insert into public.quest_completions
        (user_id, quest_id, xp_awarded, coins_awarded, source,
         evidence_count, progress_at_completion)
      values
        (v_user_id, v_quest.id, v_quest.xp_reward, v_quest.coin_reward, 'activity',
         v_count, least(v_count, v_quest.requirement_count))
      on conflict (user_id, quest_id) do nothing
      returning id into v_completion_id;

      if v_completion_id is not null then
        v_completed := true;
        v_xp := v_quest.xp_reward;
        v_coins := v_quest.coin_reward;

        update public.profiles
        set total_xp = total_xp + v_xp,
            coins = coins + v_coins
        where id = v_user_id
        returning total_xp, coins into v_new_xp, v_new_coins;
      end if;
    end if;

    out_quest_id := v_quest.id;
    out_progress := least(v_count, v_quest.requirement_count);
    out_target := v_quest.requirement_count;
    out_status := v_status;
    out_newly_completed := v_completed;
    out_xp_awarded := v_xp;
    out_coins_awarded := v_coins;
    out_new_total_xp := v_new_xp;
    out_new_coins := v_new_coins;
    return next;
  end loop;
end;
$$;

-- ============================================================
-- 8. Remove the manual completion path
-- ============================================================
drop function if exists public.complete_quest(uuid);

-- ============================================================
-- 9. Function privileges
-- ============================================================
revoke all on function public.record_activity_events(jsonb) from public, anon;
revoke all on function public.evaluate_activity_quests() from public, anon;

grant execute on function public.record_activity_events(jsonb) to authenticated;
grant execute on function public.evaluate_activity_quests() to authenticated;
