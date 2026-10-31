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

-- Phase 4 "Genesis Codex" collection (13 cosmetics, five rarity tiers).
-- Column additions live in migration 008_cosmetic_collection.sql.
insert into public.cosmetics (
  id, name, description, cosmetic_type, preview_value, price, is_active, rarity, category, is_exclusive
)
values
  ('10000000-0000-0000-0000-000000000001', 'Graphite Halo', 'A matte graphite frame cut with a single hairline groove. The quiet badge of a realm freshly founded.', 'avatar_border', 'graphite', 25, true, 'common', 'Frame', false),
  ('10000000-0000-0000-0000-000000000002', 'Silverline', 'A cool double-bevel in brushed silver. Restraint, sharpened to a clean edge.', 'avatar_border', 'silverline', 45, true, 'common', 'Frame', false),
  ('10000000-0000-0000-0000-000000000006', 'Ledgerline', 'A blueprint grid pinned by four registration ticks — the first page of work not yet done.', 'avatar_border', 'ledgerline', 65, true, 'common', 'Frame', false),
  ('10000000-0000-0000-0000-000000000003', 'Aurum Circuit', 'Traced gold circuitry loops the border like current through warm copper. Progress, made visible.', 'avatar_border', 'aurum-circuit', 110, true, 'rare', 'Frame', false),
  ('10000000-0000-0000-0000-000000000007', 'Frostbound Sigil', 'Pale rime crystallises around a circular ward. A cold oath against the long silence of unfinished projects.', 'avatar_border', 'frostbound', 140, true, 'rare', 'Sigil', false),
  ('10000000-0000-0000-0000-000000000008', 'Ember Index', 'Slow embers smoulder behind cracked obsidian. Every commit feeds the fire a little longer.', 'avatar_border', 'ember-index', 175, true, 'rare', 'Frame', false),
  ('10000000-0000-0000-0000-000000000004', 'Neon Pulse', 'A hard cyan tube bent into a frame — the hum of a city, and of a build finally passing at 3am.', 'avatar_border', 'neon-pulse', 240, true, 'epic', 'Aura', false),
  ('10000000-0000-0000-0000-000000000009', 'Voidglass Prism', 'Black glass folds a sliver of spectrum into each corner. Light goes in; edges come out.', 'avatar_border', 'voidglass', 330, true, 'epic', 'Prism', false),
  ('10000000-0000-0000-0000-000000000010', 'Aurora Meridian', 'A vertical aurora is caught mid-drift, green and violet ribbons crossing a dark meridian.', 'avatar_border', 'aurora-meridian', 420, true, 'epic', 'Aura', false),
  ('10000000-0000-0000-0000-000000000011', 'Solar Crown', 'A miniature sun orbits the frame, flares arcing between gold filaments. Prestige that never sets.', 'avatar_border', 'solar-crown', 650, true, 'legendary', 'Sigil', false),
  ('10000000-0000-0000-0000-000000000012', 'Wraithlight', 'Cold lantern-wisps drift around the border, never quite settling — the light of work done after midnight.', 'avatar_border', 'wraithlight', 850, true, 'legendary', 'Sigil', false),
  ('10000000-0000-0000-0000-000000000013', 'Astral Horizon', 'A rotating starfield whose constellations re-chart in real time. The realm renders itself anew with every commit.', 'avatar_border', 'astral-horizon', 1400, true, 'mythical', 'Constellation', false),
  ('10000000-0000-0000-0000-000000000005', 'The Root Cipher', 'Forged for the one who laid the first stone. A living blueprint of the realm''s source, signed in light — the crown jewel of RootRealm.', 'avatar_border', 'root-cipher', 0, true, 'mythical', 'Creator', true)
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  cosmetic_type = excluded.cosmetic_type,
  preview_value = excluded.preview_value,
  price = excluded.price,
  is_active = excluded.is_active,
  rarity = excluded.rarity,
  category = excluded.category,
  is_exclusive = excluded.is_exclusive;