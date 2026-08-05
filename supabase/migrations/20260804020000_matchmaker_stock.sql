-- 20260804020000_matchmaker_stock.sql — matchmaker-held shuttle stock (TASK-69).
--
-- Shuttle stock used to be a single club-wide pool (products.barrels +
-- products.loose_shuttles). In practice barrels are handed to the matchmakers
-- who run game days, and they keep them. Stock is therefore held PER
-- MATCHMAKER: every barrel belongs to someone.
--
--   holdings      — barrels + loose shuttles held by one matchmaker for one product
--   inventory_log — append-only audit trail of every stock change
--
-- A holder is a player_profiles row with is_matchmaker set, so there is no
-- parallel identity table to keep in sync: the roster already knows who the
-- matchmakers are, and their user_id drives RLS.
--
-- Existing stock migrates to the matchmaker who currently keeps the barrels
-- (Ramboo), falling back to the club's first matchmaker.
--
-- PERMISSIONS: admins allocate, transfer and correct. Matchmakers may READ
-- holdings and products so they can see what is in their own hands; they get no
-- write path here. Recording game-day usage (the one thing a matchmaker will be
-- able to write, limited to their own entries) lands with the usage task.
--
-- COMPATIBILITY: products.barrels / loose_shuttles are left in place because the
-- existing usage flow still writes them. Holdings are authoritative for display
-- from now on; the usage task moves usage onto holdings and a later migration
-- drops the redundant columns.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table holdings (
  id             uuid primary key default gen_random_uuid (),
  club_id        uuid not null references clubs (id) on delete cascade,
  product_id     uuid not null references products (id) on delete cascade,
  -- The matchmaker holding this stock. Restricted rather than cascaded: losing
  -- a roster row must not silently delete the record of stock they hold.
  holder_id      uuid not null references player_profiles (id) on delete restrict,
  barrels        integer not null default 0 check (barrels >= 0),
  loose_shuttles integer not null default 0 check (loose_shuttles >= 0),
  updated_at     timestamptz not null default now(),
  unique (product_id, holder_id)
);

-- Append-only audit trail. Holder/product FKs are ON DELETE SET NULL and the
-- readable labels are denormalised beside them, so history survives the removal
-- of a product or a roster entry.
create table inventory_log (
  id            uuid primary key default gen_random_uuid (),
  club_id       uuid not null references clubs (id) on delete cascade,
  actor_user_id uuid references auth.users (id) on delete set null,
  actor_name    text,
  holder_id     uuid references player_profiles (id) on delete set null,
  product_id    uuid references products (id) on delete set null,
  holder_name   text not null,
  product_label text not null,
  action        text not null check (action in ('allocate', 'adjust', 'transfer', 'usage', 'migrate')),
  barrels_delta integer not null default 0,
  loose_delta   integer not null default 0,
  barrels_after integer not null check (barrels_after >= 0),
  loose_after   integer not null check (loose_after >= 0),
  note          text,
  occurred_at   timestamptz not null default now()
);

create index holdings_club_idx        on holdings (club_id);
create index holdings_product_idx     on holdings (product_id);
create index holdings_holder_idx      on holdings (holder_id);
create index inventory_log_club_idx   on inventory_log (club_id);
create index inventory_log_recent_idx on inventory_log (club_id, occurred_at desc);

-- ---------------------------------------------------------------------------
-- Backfill: hand each club's existing stock to the matchmaker who keeps it.
-- Idempotent, and skips a club with no matchmaker rather than failing the
-- migration (that club simply has no holdings until one is appointed).
-- ---------------------------------------------------------------------------
do $$
declare
  c         record;
  holder    uuid;
  holder_nm text;
begin
  for c in select distinct club_id from products loop
    select id, nickname into holder, holder_nm
      from player_profiles
      where club_id = c.club_id and is_matchmaker and nickname = 'Ramboo'
      limit 1;

    if holder is null then
      select id, nickname into holder, holder_nm
        from player_profiles
        where club_id = c.club_id and is_matchmaker
        order by created_at
        limit 1;
    end if;

    if holder is null then
      raise notice 'club % has no matchmaker; stock left unallocated', c.club_id;
      continue;
    end if;

    insert into holdings (club_id, product_id, holder_id, barrels, loose_shuttles)
      select p.club_id, p.id, holder, p.barrels, p.loose_shuttles
        from products p
        where p.club_id = c.club_id
      on conflict (product_id, holder_id) do nothing;

    insert into inventory_log (
      club_id, holder_id, product_id, holder_name, product_label,
      action, barrels_delta, loose_delta, barrels_after, loose_after, note
    )
      select p.club_id, holder, p.id, holder_nm, p.brand || ' ' || p.model,
             'migrate', p.barrels, p.loose_shuttles, p.barrels, p.loose_shuttles,
             'Opening balance — stock already held by this matchmaker'
        from products p
        where p.club_id = c.club_id
          and not exists (
            select 1 from inventory_log l
            where l.product_id = p.id and l.action = 'migrate'
          );
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table holdings      enable row level security;
alter table inventory_log enable row level security;

-- Admins allocate, transfer and correct.
create policy holdings_admin_all on holdings for all to authenticated
  using (is_admin (club_id)) with check (is_admin (club_id));

-- Matchmakers may see stock (their own and the club picture) but not change it.
create policy holdings_matchmaker_read on holdings for select to authenticated
  using (is_matchmaker (club_id));

create policy inventory_log_admin_read on inventory_log for select to authenticated
  using (is_admin (club_id));

create policy inventory_log_admin_insert on inventory_log for insert to authenticated
  with check (is_admin (club_id));

-- Products are admin-only today, which would leave a matchmaker unable to name
-- the shuttles they are holding. Give them read access; writes stay admin-only.
create policy products_matchmaker_read on products for select to authenticated
  using (is_matchmaker (club_id));

grant select, insert, update, delete on holdings to authenticated;
grant select, insert on inventory_log to authenticated;
-- Append-only: RLS grants no UPDATE/DELETE policy, and Supabase's default
-- privileges would otherwise hand out full DML on a new public table.
revoke update, delete, truncate on inventory_log from authenticated, anon;
