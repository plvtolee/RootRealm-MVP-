-- RootRealm MVP — Reconcile legacy manual quest completions
-- Migration: 004_reconcile_legacy_completions
--
-- The pre-activity MVP awarded quests through complete_quest(), which wrote
-- quest_completions without evidence_count or progress_at_completion.
-- Migration 002 backfilled source='activity', so those rows would otherwise be
-- treated as legitimate activity completions by evaluate_activity_quests().
--
-- Activity completions always set both evidence fields. Remove rows that lack
-- them, subtract their rewards (clamped at zero), and clear derived progress so
-- the next sync re-evaluates against real GitHub activity.

with legacy as (
  delete from public.quest_completions
  where evidence_count is null
     or progress_at_completion is null
  returning user_id, xp_awarded, coins_awarded
),
totals as (
  select
    user_id,
    sum(xp_awarded)::integer as xp,
    sum(coins_awarded)::integer as coins
  from legacy
  group by user_id
)
update public.profiles p
set total_xp = greatest(0, p.total_xp - totals.xp),
    coins = greatest(0, p.coins - totals.coins)
from totals
where p.id = totals.user_id;

-- Progress is derived state; the next sync rebuilds it from real activity.
delete from public.quest_progress;
