-- 20260622112251_seed_demo_fund_data.sql — DEMO fund data (E06).
-- Real club snapshot ported from the badminton-tracker prototype (2026-06-18),
-- so the admin dashboard shows live values. Scoped to this project's single club.
-- Idempotent (fixed UUIDs + ON CONFLICT DO NOTHING).
--
-- NOTE: this is demo/seed data, not schema. Delete this migration before
-- standing up a clean production database.

do $$
declare cid uuid;
begin
  select id into cid from clubs order by created_at limit 1;
  if cid is null then
    raise exception 'no club found to attach demo data to';
  end if;

  -- Members (the four founding members) ---------------------------------------
  insert into members (id, club_id, name, created_at) values
    ('00000000-0000-0000-0000-0000000000a1', cid, 'Uditha',  '2026-06-17T14:24:03.140609+00:00'),
    ('00000000-0000-0000-0000-0000000000a2', cid, 'Sahan',   '2026-06-17T14:24:03.140609+00:00'),
    ('00000000-0000-0000-0000-0000000000a3', cid, 'Nilusha', '2026-06-17T14:24:03.140609+00:00'),
    ('00000000-0000-0000-0000-0000000000a4', cid, 'Ramindu', '2026-06-17T14:24:03.140609+00:00')
  on conflict (id) do nothing;

  -- Contributions (200 € each) ------------------------------------------------
  insert into contributions (id, club_id, member_id, amount, occurred_at) values
    ('00000000-0000-0000-0000-0000000000b1', cid, '00000000-0000-0000-0000-0000000000a1', 200, '2026-06-15T13:00:00+00:00'),
    ('00000000-0000-0000-0000-0000000000b2', cid, '00000000-0000-0000-0000-0000000000a2', 200, '2026-06-15T13:00:00+00:00'),
    ('00000000-0000-0000-0000-0000000000b3', cid, '00000000-0000-0000-0000-0000000000a3', 200, '2026-06-15T13:00:00+00:00'),
    ('00000000-0000-0000-0000-0000000000b4', cid, '00000000-0000-0000-0000-0000000000a4', 200, '2026-06-15T13:00:00+00:00')
  on conflict (id) do nothing;

  -- Products (current stock: RSL 19 barrels + 8 loose, Victor 10) -------------
  insert into products (id, club_id, brand, model, shuttles_per_barrel, barrels, loose_shuttles) values
    ('00000000-0000-0000-0000-0000000000c1', cid, 'RSL',    'Classic Academy',     12, 19, 8),
    ('00000000-0000-0000-0000-0000000000c2', cid, 'Victor', 'New Carbonsonic Pro', 12, 10, 0)
  on conflict (id) do nothing;

  -- Purchase batches (RSL @ 27.50, Victor @ 21.85) ----------------------------
  insert into purchases (id, club_id, product_id, barrels, price_per_barrel, occurred_at, note) values
    ('00000000-0000-0000-0000-0000000000d1', cid, '00000000-0000-0000-0000-0000000000c1', 20, 27.50, '2026-06-15T18:00:00+00:00', 'Initial RSL batch'),
    ('00000000-0000-0000-0000-0000000000d2', cid, '00000000-0000-0000-0000-0000000000c2', 10, 21.85, '2026-06-15T18:00:00+00:00', 'Initial Victor batch')
  on conflict (id) do nothing;

  -- Game-day usage (RSL 4 shuttles on 2026-06-17) -----------------------------
  insert into usage_entries (id, club_id, occurred_at) values
    ('53d5c210-1f4c-4e33-8b1b-1b2db410bf3c', cid, '2026-06-17T20:00:00+00:00')
  on conflict (id) do nothing;

  insert into usage_items (club_id, usage_id, product_id, shuttles_used) values
    (cid, '53d5c210-1f4c-4e33-8b1b-1b2db410bf3c', '00000000-0000-0000-0000-0000000000c1', 4)
  on conflict (usage_id, product_id) do nothing;

  -- Expenses ------------------------------------------------------------------
  insert into expenses (id, club_id, description, amount, occurred_at) values
    ('00000000-0000-0000-0000-0000000000e1', cid, '2 Bergen 60L boxes (pro-rated 3-for-25€ offer)', 16.67, '2026-06-16T19:00:00+00:00')
  on conflict (id) do nothing;
end $$;
