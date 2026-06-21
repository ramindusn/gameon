-- 20260622013300_init.sql — initial migration: tenancy root.
-- Establishes the tracked-migration flow + RLS pattern. Feature tables
-- (players, draws, matches, ranking, fund) are added in their epics.

create extension if not exists pgcrypto; -- gen_random_uuid()

create table if not exists clubs (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  created_at timestamptz not null default now()
);

alter table clubs enable row level security;

-- Public site can read club info; writes go through the service role only
-- (no write policy = denied for anon/authenticated).
create policy clubs_public_read on clubs
  for select using (true);
