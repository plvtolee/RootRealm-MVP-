-- RootRealm MVP Schema
-- Migration: 001_initial_schema
-- Creates all tables, RLS policies, and transactional functions.

-- ============================================================
-- Extensions
-- ============================================================
create extension if not exists "pgcrypto";

-- ============================================================
-- Tables
-- ============================================================

-- Profiles: one per authenticated user
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  avatar_url text,
  total_xp integer not null default 0 check (total_xp >= 0),
  coins integer not null default 0 check (coins >= 0),
  equipped_cosmetic_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Quests: one-time completable tasks
create table public.quests (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  difficulty text not null check (difficulty in ('easy', 'medium', 'hard')),
  xp_reward integer not null check (xp_reward > 0),
  coin_reward integer not null check (coin_reward > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Quest completions: one per user+quest
create table public.quest_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  quest_id uuid not null references public.quests(id) on delete cascade,
  xp_awarded integer not null,
  coins_awarded integer not null,
  completed_at timestamptz not null default now(),
  unique (user_id, quest_id)
);

-- Cosmetics: purchasable avatar borders
create table public.cosmetics (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null,
  cosmetic_type text not null default 'avatar_border',
  preview_value text not null,
  price integer not null check (price >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- User cosmetics: ownership records
create table public.user_cosmetics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  cosmetic_id uuid not null references public.cosmetics(id) on delete cascade,
  purchased_at timestamptz not null default now(),
  unique (user_id, cosmetic_id)
);

-- Add the equipped cosmetic FK now that cosmetics exists
alter table public.profiles
  add constraint profiles_equipped_cosmetic_fk
  foreign key (equipped_cosmetic_id) references public.cosmetics(id) on delete set null;

-- ============================================================
-- Indexes
-- ============================================================
create index quest_completions_user_idx on public.quest_completions(user_id);
create index quest_completions_quest_idx on public.quest_completions(quest_id);
create index user_cosmetics_user_idx on public.user_cosmetics(user_id);
create index quests_active_idx on public.quests(is_active) where is_active = true;
create index cosmetics_active_idx on public.cosmetics(is_active) where is_active = true;

-- ============================================================
-- updated_at trigger
-- ============================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ============================================================
-- Row Level Security
-- ============================================================
alter table public.profiles enable row level security;
alter table public.quests enable row level security;
alter table public.quest_completions enable row level security;
alter table public.cosmetics enable row level security;
alter table public.user_cosmetics enable row level security;

-- Profiles: users may read only their own row.
-- There is deliberately NO insert/update/delete policy: profile writes happen
-- exclusively through the server (service role) at sign-in and through the
-- SECURITY DEFINER functions below. This prevents a client from setting its
-- own XP, coins, or equipped border directly.
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

-- Quests: everyone authenticated can read active quests; inactive only hidden.
create policy "quests_select_active"
  on public.quests for select
  to authenticated
  using (is_active = true);

-- Quest completions: users can read their own.
create policy "quest_completions_select_own"
  on public.quest_completions for select
  using (auth.uid() = user_id);

-- Cosmetics: authenticated users can read active cosmetics.
create policy "cosmetics_select_active"
  on public.cosmetics for select
  to authenticated
  using (is_active = true);

-- User cosmetics: users can read their own ownership records.
create policy "user_cosmetics_select_own"
  on public.user_cosmetics for select
  using (auth.uid() = user_id);

-- ============================================================
-- Privileges: defense in depth
-- ============================================================
-- RLS already blocks unauthorized writes, but explicitly revoke direct write
-- access so clients can only read catalog/profile/ownership data. All game
-- state changes go through the SECURITY DEFINER functions below.
revoke insert, update, delete on public.profiles from anon, authenticated;
revoke insert, update, delete on public.quests from anon, authenticated;
revoke insert, update, delete on public.quest_completions from anon, authenticated;
revoke insert, update, delete on public.cosmetics from anon, authenticated;
revoke insert, update, delete on public.user_cosmetics from anon, authenticated;

grant select on public.profiles to authenticated;
grant select on public.quests to authenticated;
grant select on public.quest_completions to authenticated;
grant select on public.cosmetics to authenticated;
grant select on public.user_cosmetics to authenticated;

-- ============================================================
-- Transactional functions (run as the calling user; SECURITY INVOKER)
-- ============================================================
-- NOTE: quest completion and purchase happen exclusively through these
-- functions. They are SECURITY DEFINER so the writes bypass RLS, but they
-- derive the acting user from auth.uid() and never accept a user id from
-- the client.

-- Complete a quest exactly once, awarding its configured rewards.
create or replace function public.complete_quest(p_quest_id uuid)
returns table (
  quest_completion_id uuid,
  xp_awarded integer,
  coins_awarded integer,
  new_total_xp integer,
  new_coins integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_quest public.quests%rowtype;
  v_completion_id uuid;
begin
  if v_user_id is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  -- Lock and validate the quest.
  select * into v_quest
  from public.quests
  where id = p_quest_id
    and is_active = true
  for share;

  if not found then
    raise exception 'Quest not found or inactive' using errcode = 'P0002';
  end if;

  -- Insert completion; the unique constraint makes this atomic and
  -- guarantees exactly-once rewards under concurrency.
  begin
    insert into public.quest_completions (user_id, quest_id, xp_awarded, coins_awarded)
    values (v_user_id, p_quest_id, v_quest.xp_reward, v_quest.coin_reward)
    returning id into v_completion_id;
  exception
    when unique_violation then
      raise exception 'Quest already completed' using errcode = '23505';
  end;

  -- Award rewards and return fresh balances.
  update public.profiles
  set total_xp = total_xp + v_quest.xp_reward,
      coins = coins + v_quest.coin_reward
  where id = v_user_id
  returning total_xp, coins into new_total_xp, new_coins;

  quest_completion_id := v_completion_id;
  xp_awarded := v_quest.xp_reward;
  coins_awarded := v_quest.coin_reward;
  return next;
end;
$$;

-- Purchase a cosmetic atomically: deduct coins and grant ownership.
create or replace function public.purchase_cosmetic(p_cosmetic_id uuid)
returns table (
  cosmetic_id uuid,
  price_paid integer,
  new_coins integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_cosmetic public.cosmetics%rowtype;
  v_current_coins integer;
begin
  if v_user_id is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  select * into v_cosmetic
  from public.cosmetics
  where id = p_cosmetic_id
    and is_active = true
  for share;

  if not found then
    raise exception 'Cosmetic not found or inactive' using errcode = 'P0002';
  end if;

  -- Lock the profile row for the balance update.
  select coins into v_current_coins
  from public.profiles
  where id = v_user_id
  for update;

  if not found then
    raise exception 'Profile not found' using errcode = 'P0002';
  end if;

  if v_current_coins < v_cosmetic.price then
    raise exception 'Insufficient coins' using errcode = 'P0001';
  end if;

  -- Grant ownership first; unique constraint prevents duplicate charges.
  begin
    insert into public.user_cosmetics (user_id, cosmetic_id)
    values (v_user_id, p_cosmetic_id);
  exception
    when unique_violation then
      raise exception 'Cosmetic already owned' using errcode = '23505';
  end;

  update public.profiles
  set coins = coins - v_cosmetic.price
  where id = v_user_id
  returning coins into new_coins;

  cosmetic_id := p_cosmetic_id;
  price_paid := v_cosmetic.price;
  return next;
end;
$$;

-- Equip an owned cosmetic. Passing NULL unequips.
create or replace function public.equip_cosmetic(p_cosmetic_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  if p_cosmetic_id is not null then
    if not exists (
      select 1 from public.user_cosmetics
      where user_id = v_user_id and cosmetic_id = p_cosmetic_id
    ) then
      raise exception 'Cosmetic not owned' using errcode = 'P0001';
    end if;
  end if;

  update public.profiles
  set equipped_cosmetic_id = p_cosmetic_id
  where id = v_user_id;
end;
$$;

-- Revoke broad execute and grant only to authenticated users.
revoke all on function public.complete_quest(uuid) from public, anon;
revoke all on function public.purchase_cosmetic(uuid) from public, anon;
revoke all on function public.equip_cosmetic(uuid) from public, anon;

grant execute on function public.complete_quest(uuid) to authenticated;
grant execute on function public.purchase_cosmetic(uuid) to authenticated;
grant execute on function public.equip_cosmetic(uuid) to authenticated;