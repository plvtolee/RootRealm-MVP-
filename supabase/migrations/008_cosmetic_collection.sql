-- ============================================================
-- Phase 4: Cosmetic Collection Overhaul
-- Migration: 008_cosmetic_collection
--
-- Adds a five-tier rarity system, presentation categories, and a
-- Creator Exclusive designation to the cosmetic catalogue, then
-- redefines the original collection and introduces the full
-- "Genesis Codex" set (13 items).
--
-- Existing cosmetic ids are preserved so ownership records and
-- equipped references survive unchanged.
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1. New catalogue attributes
-- ------------------------------------------------------------
alter table public.cosmetics
  add column if not exists rarity text not null default 'common'
    check (rarity in ('common', 'rare', 'epic', 'legendary', 'mythical')),
  add column if not exists category text not null default 'Frame',
  add column if not exists is_exclusive boolean not null default false;

comment on column public.cosmetics.rarity is
  'Five-tier collectible rarity: common | rare | epic | legendary | mythical.';
comment on column public.cosmetics.category is
  'Presentation grouping used by the shop filters (Frame, Sigil, Aura, Prism, Constellation, Creator).';
comment on column public.cosmetics.is_exclusive is
  'Creator Exclusive items cannot be purchased; ownership is granted out-of-band.';

create index if not exists cosmetics_rarity_idx on public.cosmetics(rarity);
create index if not exists cosmetics_category_idx on public.cosmetics(category);

-- ------------------------------------------------------------
-- 2. The Genesis Codex — 13 cosmetics
--
-- The five original ids (...0001-...0005) are redesigned in place;
-- eight new ids (...0006-...0013) extend the collection.
-- preview_value is the stable CSS/artwork key for each item.
-- ------------------------------------------------------------
insert into public.cosmetics (
  id, name, description, cosmetic_type, preview_value, price, is_active, rarity, category, is_exclusive
)
values
  -- Common ---------------------------------------------------
  ('10000000-0000-0000-0000-000000000001',
   'Graphite Halo',
   'A matte graphite frame cut with a single hairline groove. The quiet badge of a realm freshly founded.',
   'avatar_border', 'graphite', 25, true, 'common', 'Frame', false),

  ('10000000-0000-0000-0000-000000000002',
   'Silverline',
   'A cool double-bevel in brushed silver. Restraint, sharpened to a clean edge.',
   'avatar_border', 'silverline', 45, true, 'common', 'Frame', false),

  ('10000000-0000-0000-0000-000000000006',
   'Ledgerline',
   'A blueprint grid pinned by four registration ticks — the first page of work not yet done.',
   'avatar_border', 'ledgerline', 65, true, 'common', 'Frame', false),

  -- Rare -----------------------------------------------------
  ('10000000-0000-0000-0000-000000000003',
   'Aurum Circuit',
   'Traced gold circuitry loops the border like current through warm copper. Progress, made visible.',
   'avatar_border', 'aurum-circuit', 110, true, 'rare', 'Frame', false),

  ('10000000-0000-0000-0000-000000000007',
   'Frostbound Sigil',
   'Pale rime crystallises around a circular ward. A cold oath against the long silence of unfinished projects.',
   'avatar_border', 'frostbound', 140, true, 'rare', 'Sigil', false),

  ('10000000-0000-0000-0000-000000000008',
   'Ember Index',
   'Slow embers smoulder behind cracked obsidian. Every commit feeds the fire a little longer.',
   'avatar_border', 'ember-index', 175, true, 'rare', 'Frame', false),

  -- Epic -----------------------------------------------------
  ('10000000-0000-0000-0000-000000000004',
   'Neon Pulse',
   'A hard cyan tube bent into a frame — the hum of a city, and of a build finally passing at 3am.',
   'avatar_border', 'neon-pulse', 240, true, 'epic', 'Aura', false),

  ('10000000-0000-0000-0000-000000000009',
   'Voidglass Prism',
   'Black glass folds a sliver of spectrum into each corner. Light goes in; edges come out.',
   'avatar_border', 'voidglass', 330, true, 'epic', 'Prism', false),

  ('10000000-0000-0000-0000-000000000010',
   'Aurora Meridian',
   'A vertical aurora is caught mid-drift, green and violet ribbons crossing a dark meridian.',
   'avatar_border', 'aurora-meridian', 420, true, 'epic', 'Aura', false),

  -- Legendary ------------------------------------------------
  ('10000000-0000-0000-0000-000000000011',
   'Solar Crown',
   'A miniature sun orbits the frame, flares arcing between gold filaments. Prestige that never sets.',
   'avatar_border', 'solar-crown', 650, true, 'legendary', 'Sigil', false),

  ('10000000-0000-0000-0000-000000000012',
   'Wraithlight',
   'Cold lantern-wisps drift around the border, never quite settling — the light of work done after midnight.',
   'avatar_border', 'wraithlight', 850, true, 'legendary', 'Sigil', false),

  -- Mythical -------------------------------------------------
  ('10000000-0000-0000-0000-000000000013',
   'Astral Horizon',
   'A rotating starfield whose constellations re-chart in real time. The realm renders itself anew with every commit.',
   'avatar_border', 'astral-horizon', 1400, true, 'mythical', 'Constellation', false),

  ('10000000-0000-0000-0000-000000000005',
   'The Root Cipher',
   'Forged for the one who laid the first stone. A living blueprint of the realm''s source, signed in light — the crown jewel of RootRealm.',
   'avatar_border', 'root-cipher', 0, true, 'mythical', 'Creator', true)
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

-- ------------------------------------------------------------
-- 3. Creator Exclusive items are never purchasable
-- ------------------------------------------------------------
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

  -- Creator Exclusive items are granted out-of-band and can never be bought.
  if v_cosmetic.is_exclusive then
    raise exception 'Cosmetic is not available for purchase' using errcode = 'P0001';
  end if;

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

revoke all on function public.purchase_cosmetic(uuid) from public, anon;
grant execute on function public.purchase_cosmetic(uuid) to authenticated;

commit;
