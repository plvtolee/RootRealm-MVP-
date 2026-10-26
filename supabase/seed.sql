-- RootRealm MVP Seed Data
-- Sample quests and cosmetics. Safe to re-run: uses deterministic UUIDs.

insert into public.quests (id, title, description, difficulty, xp_reward, coin_reward, is_active)
values
  ('00000000-0000-0000-0000-000000000001', 'Hello, Realm', 'Sign in to RootRealm and set up your profile.', 'easy', 25, 10, true),
  ('00000000-0000-0000-0000-000000000002', 'First Steps', 'Explore the Quests section and complete your first quest.', 'easy', 30, 15, true),
  ('00000000-0000-0000-0000-000000000003', 'Window Shopper', 'Browse the Shop and inspect every cosmetic.', 'easy', 20, 5, true),
  ('00000000-0000-0000-0000-000000000004', 'Builder''s Resolve', 'Ship a small feature end to end.', 'medium', 75, 40, true),
  ('00000000-0000-0000-0000-000000000005', 'Bug Slayer', 'Track down and fix a stubborn bug.', 'medium', 90, 50, true),
  ('00000000-0000-0000-0000-000000000006', 'Code Review', 'Leave a thoughtful review on a teammate''s pull request.', 'medium', 60, 30, true),
  ('00000000-0000-0000-0000-000000000007', 'Ship It', 'Deploy a meaningful change to production.', 'hard', 180, 100, true),
  ('00000000-0000-0000-0000-000000000008', 'Legacy Wrangler', 'Refactor an old module without breaking behavior.', 'hard', 150, 90, true),
  ('00000000-0000-0000-0000-000000000009', 'Mentor', 'Help another developer level up their skills.', 'hard', 160, 85, true),
  ('00000000-0000-0000-0000-00000000000a', 'Retired Trial', 'This quest is no longer available.', 'easy', 10, 5, false)
on conflict (id) do nothing;

insert into public.cosmetics (id, name, description, cosmetic_type, preview_value, price, is_active)
values
  ('10000000-0000-0000-0000-000000000001', 'Basic Border', 'A simple, understated outline.', 'avatar_border', 'basic', 25, true),
  ('10000000-0000-0000-0000-000000000002', 'Silver Border', 'A clean metallic silver ring.', 'avatar_border', 'silver', 60, true),
  ('10000000-0000-0000-0000-000000000003', 'Gold Border', 'A warm golden glow.', 'avatar_border', 'gold', 120, true),
  ('10000000-0000-0000-0000-000000000004', 'Neon Border', 'A bright cyberpunk cyan aura.', 'avatar_border', 'neon', 200, true),
  ('10000000-0000-0000-0000-000000000005', 'Ancient Relic', 'No longer sold in the shop.', 'avatar_border', 'relic', 999, false)
on conflict (id) do nothing;