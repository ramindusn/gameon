-- 20260622160000_attendance.sql — E05 absence decay (TASK-6.5). See ADR 0011.
-- To penalise players who skip game days, absence must be HISTORICAL, not just
-- the mutable player_profiles.absent flag (current state). This table snapshots,
-- per finished game day (session), which club players were present vs absent.
--
-- The snapshot is written once by the recompute-ratings Edge Function (service
-- role) for any finished session that has no attendance yet, then frozen: a
-- player added later is never retroactively marked absent for past days. The
-- recompute reads these rows to apply the per-game-day decay; the leaderboard
-- reads them (public) to flag recently-inactive players.

create table session_attendance (
  session_id  uuid not null references match_sessions (id) on delete cascade,
  player_id   uuid not null references player_profiles (id) on delete cascade,
  club_id     uuid not null references clubs (id) on delete cascade,
  present     boolean not null,
  recorded_at timestamptz not null default now(),
  primary key (session_id, player_id)
);

create index session_attendance_session_idx on session_attendance (session_id);
create index session_attendance_club_idx on session_attendance (club_id);

-- RLS: public read (the leaderboard derives the "inactive" set from the latest
-- game day). Writes only by the service-role recompute (no app-user policy).
alter table session_attendance enable row level security;

create policy session_attendance_public_read on session_attendance
  for select using (true);

grant select on session_attendance to anon, authenticated;
