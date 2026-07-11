-- Game days can be hidden from the public home's Game Day Podium (TASK-38).
-- The matchmaker ticks "Don't show on home page" next to Finish game day; the
-- home only shows game days where hidden = false.
alter table public.match_sessions
  add column if not exists hidden boolean not null default false;

-- Backfill existing data (all environments): keep only weekend game days
-- (Saturday/Sunday) on the public home and hide everything else. Going forward
-- the checkbox controls this per game day. DOW: 0 = Sunday, 6 = Saturday.
update public.match_sessions
  set hidden = true
  where extract(dow from played_at) not in (0, 6);
