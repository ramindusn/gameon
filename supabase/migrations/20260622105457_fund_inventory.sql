-- 20260622105457_fund_inventory.sql — E06 club-ops fund & inventory (TASK-7.2).
-- Mirrors @gameon/domain/fund types. Club-scoped; club-ops is Admin-only, so
-- every table is read+write restricted to admins of its club via is_admin().
-- club_id is denormalised onto every table to keep RLS policies simple.

create table members (
  id         uuid primary key default gen_random_uuid (),
  club_id    uuid not null references clubs (id) on delete cascade,
  name       text not null,
  created_at timestamptz not null default now()
);

create table contributions (
  id          uuid primary key default gen_random_uuid (),
  club_id     uuid not null references clubs (id) on delete cascade,
  member_id   uuid not null references members (id) on delete cascade,
  amount      numeric(10, 2) not null check (amount > 0),
  occurred_at timestamptz not null default now()
);

create table products (
  id                  uuid primary key default gen_random_uuid (),
  club_id             uuid not null references clubs (id) on delete cascade,
  brand               text not null,
  model               text not null,
  shuttles_per_barrel integer not null default 12 check (shuttles_per_barrel > 0),
  barrels             integer not null default 0 check (barrels >= 0),
  loose_shuttles      integer not null default 0 check (loose_shuttles >= 0)
);

create table purchases (
  id               uuid primary key default gen_random_uuid (),
  club_id          uuid not null references clubs (id) on delete cascade,
  product_id       uuid not null references products (id) on delete cascade,
  barrels          integer not null check (barrels >= 0),
  price_per_barrel numeric(10, 2) not null check (price_per_barrel >= 0),
  occurred_at      timestamptz not null default now(),
  note             text
);

create table usage_entries (
  id          uuid primary key default gen_random_uuid (),
  club_id     uuid not null references clubs (id) on delete cascade,
  occurred_at timestamptz not null default now()
);

create table usage_items (
  club_id       uuid not null references clubs (id) on delete cascade,
  usage_id      uuid not null references usage_entries (id) on delete cascade,
  product_id    uuid not null references products (id) on delete cascade,
  shuttles_used integer not null check (shuttles_used > 0),
  primary key (usage_id, product_id)
);

create table expenses (
  id          uuid primary key default gen_random_uuid (),
  club_id     uuid not null references clubs (id) on delete cascade,
  description text not null,
  amount      numeric(10, 2) not null check (amount > 0),
  occurred_at timestamptz not null default now()
);

-- FK / lookup indexes.
create index members_club_idx        on members (club_id);
create index contributions_club_idx  on contributions (club_id);
create index contributions_member_idx on contributions (member_id);
create index products_club_idx       on products (club_id);
create index purchases_club_idx      on purchases (club_id);
create index purchases_product_idx   on purchases (product_id);
create index usage_entries_club_idx  on usage_entries (club_id);
create index usage_items_usage_idx   on usage_items (usage_id);
create index usage_items_product_idx on usage_items (product_id);
create index expenses_club_idx       on expenses (club_id);

-- ---------------------------------------------------------------------------
-- RLS: club-ops is Admin-only. Reuse is_admin(club) (security definer, set in
-- the identity migration). Grant DML to authenticated; RLS filters to admins.
-- ---------------------------------------------------------------------------
alter table members       enable row level security;
alter table contributions enable row level security;
alter table products      enable row level security;
alter table purchases     enable row level security;
alter table usage_entries enable row level security;
alter table usage_items   enable row level security;
alter table expenses      enable row level security;

create policy members_admin       on members       for all to authenticated using (is_admin (club_id)) with check (is_admin (club_id));
create policy contributions_admin on contributions for all to authenticated using (is_admin (club_id)) with check (is_admin (club_id));
create policy products_admin      on products      for all to authenticated using (is_admin (club_id)) with check (is_admin (club_id));
create policy purchases_admin     on purchases     for all to authenticated using (is_admin (club_id)) with check (is_admin (club_id));
create policy usage_entries_admin on usage_entries for all to authenticated using (is_admin (club_id)) with check (is_admin (club_id));
create policy usage_items_admin   on usage_items   for all to authenticated using (is_admin (club_id)) with check (is_admin (club_id));
create policy expenses_admin      on expenses      for all to authenticated using (is_admin (club_id)) with check (is_admin (club_id));

grant select, insert, update, delete on
  members, contributions, products, purchases, usage_entries, usage_items, expenses
  to authenticated;
