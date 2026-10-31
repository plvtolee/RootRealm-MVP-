-- RootRealm Phase 3 — Development Test Users
-- Run this manually in Supabase SQL Editor to add test users
-- DO NOT run in production

-- Insert test users directly into auth.users (using auth.uid() would require actual auth)
-- Note: This requires service role or direct SQL execution

-- Create test users with known UUIDs for consistent testing
DO $$
DECLARE
  v_user1_id uuid := gen_random_uuid();
  v_user2_id uuid := gen_random_uuid();
  v_user3_id uuid := gen_random_uuid();
BEGIN
  -- Insert into auth.users (requires service role)
  -- For local development, you can use the Supabase dashboard to create users
  -- This script creates the profile records assuming users exist

  -- User 1: TestBot
  INSERT INTO public.profiles (id, username, display_name, avatar_url, total_xp, coins, visibility, created_at)
  VALUES (v_user1_id, 'testbot', 'TestBot', null, 1250, 500, 'public', now() - interval '30 days')
  ON CONFLICT (id) DO NOTHING;

  -- User 2: CodeMaster
  INSERT INTO public.profiles (id, username, display_name, avatar_url, total_xp, coins, visibility, created_at)
  VALUES (v_user2_id, 'codemaster', 'CodeMaster', null, 2100, 800, 'public', now() - interval '15 days')
  ON CONFLICT (id) DO NOTHING;

  -- User 3: DevExplorer
  INSERT INTO public.profiles (id, username, display_name, avatar_url, total_xp, coins, visibility, created_at)
  VALUES (v_user3_id, 'devexplorer', 'DevExplorer', null, 800, 200, 'public', now() - interval '5 days')
  ON CONFLICT (id) DO NOTHING;

  -- Add some GitHub connections for these test users (optional)
  INSERT INTO public.github_connections (user_id, github_login, github_user_id, scopes, needs_reauth, commits_history_complete, prs_history_complete)
  VALUES
    (v_user1_id, 'testbot', 1000001, '{"read:user","user:email"}', false, true, true),
    (v_user2_id, 'codemaster', 1000002, '{"read:user","user:email"}', false, true, true),
    (v_user3_id, 'devexplorer', 1000003, '{"read:user","user:email"}', false, true, true)
  ON CONFLICT (user_id) DO NOTHING;

  -- Add some activity events for test users
  INSERT INTO public.github_activity_events (user_id, activity_type, external_id, repo_full_name, occurred_at, metadata)
  VALUES
    (v_user1_id, 'commit', 'evt_1', 'testbot/project1', now() - interval '1 day', '{}'::jsonb),
    (v_user1_id, 'commit', 'evt_2', 'testbot/project1', now() - interval '2 days', '{}'::jsonb),
    (v_user1_id, 'merged_pr', 'evt_3', 'testbot/project2', now() - interval '3 days', '{}'::jsonb),
    (v_user2_id, 'commit', 'evt_4', 'codemaster/awesome', now() - interval '1 day', '{}'::jsonb),
    (v_user2_id, 'commit', 'evt_5', 'codemaster/awesome', now() - interval '5 days', '{}'::jsonb),
    (v_user2_id, 'merged_pr', 'evt_6', 'codemaster/awesome', now() - interval '7 days', '{}'::jsonb),
    (v_user3_id, 'commit', 'evt_7', 'devexplorer/learning', now() - interval '2 days', '{}'::jsonb)
  ON CONFLICT (user_id, activity_type, external_id) DO NOTHING;

  -- Add some quest completions
  INSERT INTO public.quest_completions (user_id, quest_id, xp_awarded, coins_awarded, completed_at, source)
  SELECT v_user1_id, id, xp_reward, coin_reward, now() - interval '10 days', 'activity'
  FROM public.quests WHERE id IN ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.quest_completions (user_id, quest_id, xp_awarded, coins_awarded, completed_at, source)
  SELECT v_user2_id, id, xp_reward, coin_reward, now() - interval '20 days', 'activity'
  FROM public.quests WHERE id IN ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000005')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.quest_completions (user_id, quest_id, xp_awarded, coins_awarded, completed_at, source)
  SELECT v_user3_id, id, xp_reward, coin_reward, now() - interval '2 days', 'activity'
  FROM public.quests WHERE id = '00000000-0000-0000-0000-000000000001'
  ON CONFLICT DO NOTHING;

  -- Add some friend connections between test users
  INSERT INTO public.user_connections (requester_id, recipient_id, status, created_at)
  VALUES
    (v_user1_id, v_user2_id, 'accepted', now() - interval '10 days'),
    (v_user3_id, v_user1_id, 'pending', now() - interval '1 day')
  ON CONFLICT DO NOTHING;

END $$;