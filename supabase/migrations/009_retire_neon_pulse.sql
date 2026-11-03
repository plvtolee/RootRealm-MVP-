-- Retire Neon Pulse from the shop while preserving existing ownership records.
update public.cosmetics
set is_active = false
where id = '10000000-0000-0000-0000-000000000004'
  and preview_value = 'neon-pulse';
