-- RootRealm Phase 3 — Fix integer type on get_public_profile_stats.level
-- Migration: 007_fix_public_profile_stats_type
--
-- Once 006 removed the PL/pgSQL name ambiguity, get_public_profile_stats
-- surfaced a second defect: `floor(v_total_xp / 100) + 1` evaluates to
-- double precision, but the RETURNS TABLE column `level` is integer, so
-- PostgREST rejects the result with 42804
-- ("Returned type double precision does not match expected type integer").
--
-- Integer division already floors for non-negative XP, so the expression below
-- yields an integer directly. No tables, RLS, indexes, or grants are changed.

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
    (v_total_xp / 100) + 1 as level,
    v_commits, v_prs, v_repos;
end;
$$;

revoke all on function public.get_public_profile_stats(uuid) from public, anon;
grant execute on function public.get_public_profile_stats(uuid) to authenticated, anon;
