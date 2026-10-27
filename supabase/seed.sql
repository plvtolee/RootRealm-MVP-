-- RootRealm MVP Seed Data
-- Activity-based, all-time milestone quests + cosmetics.
-- Safe to re-run: deterministic UUIDs and upserts.
--
-- NOTE: migrations/003_activity_quests.sql applies the same quest catalog to
-- existing projects via `supabase db push`. Keep the two quest blocks in sync.

insert into public.quests (
  id, title, description, difficulty, xp_reward, coin_reward, is_active,
  activity_type, requirement_count, window_days, exclude_merge_commits, repo_filter
)
values
  (
    '00000000-0000-0000-0000-000000000001',
    'First Commit',
    'Land your first qualifying commit on GitHub.',
    'easy', 25, 10, true,
    'commit', 1, null, true, null
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    'First Merge',
    'Get your first pull request merged.',
    'easy', 30, 15, true,
    'merged_pr', 1, null, true, null
  ),
  (
    '00000000-0000-0000-0000-000000000003',
    'Getting Started',
    'Land 5 qualifying commits.',
    'easy', 40, 20, true,
    'commit', 5, null, true, null
  ),
  (
    '00000000-0000-0000-0000-000000000004',
    'Ten Commits',
    'Land 10 qualifying commits.',
    'medium', 60, 30, true,
    'commit', 10, null, true, null
  ),
  (
    '00000000-0000-0000-0000-000000000005',
    'PR Practitioner',
    'Get 3 pull requests merged.',
    'medium', 90, 50, true,
    'merged_pr', 3, null, true, null
  ),
  (
    '00000000-0000-0000-0000-000000000006',
    'Steady Builder',
    'Land 15 qualifying commits.',
    'medium', 75, 40, true,
    'commit', 15, null, true, null
  ),
  (
    '00000000-0000-0000-0000-000000000007',
    'Prolific Committer',
    'Land 50 qualifying commits.',
    'hard', 180, 100, true,
    'commit', 50, null, true, null
  ),
  (
    '00000000-0000-0000-0000-000000000008',
    'Merge Master',
    'Get 10 pull requests merged.',
    'hard', 150, 90, true,
    'merged_pr', 10, null, true, null
  ),
  (
    '00000000-0000-0000-0000-000000000009',
    'Shipping Machine',
    'Get 25 pull requests merged.',
    'hard', 200, 120, true,
    'merged_pr', 25, null, true, null
  ),
  (
    '00000000-0000-0000-0000-00000000000a',
    'Retired Trial',
    'This quest is no longer available.',
    'easy', 10, 5, false,
    'commit', 999, null, true, null
  )
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  difficulty = excluded.difficulty,
  xp_reward = excluded.xp_reward,
  coin_reward = excluded.coin_reward,
  is_active = excluded.is_active,
  activity_type = excluded.activity_type,
  requirement_count = excluded.requirement_count,
  window_days = excluded.window_days,
  exclude_merge_commits = excluded.exclude_merge_commits,
  repo_filter = excluded.repo_filter;

insert into public.cosmetics (id, name, description, cosmetic_type, preview_value, price, is_active)
values
  ('10000000-0000-0000-0000-000000000001', 'Basic Border', 'A simple, understated outline.', 'avatar_border', 'basic', 25, true),
  ('10000000-0000-0000-0000-000000000002', 'Silver Border', 'A clean metallic silver ring.', 'avatar_border', 'silver', 60, true),
  ('10000000-0000-0000-0000-000000000003', 'Gold Border', 'A warm golden glow.', 'avatar_border', 'gold', 120, true),
  ('10000000-0000-0000-0000-000000000004', 'Neon Border', 'A bright cyberpunk cyan aura.', 'avatar_border', 'neon', 200, true),
  ('10000000-0000-0000-0000-000000000005', 'Ancient Relic', 'No longer sold in the shop.', 'avatar_border', 'relic', 999, false)
on conflict (id) do nothing;