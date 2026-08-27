-- 20260827010000_archive_and_restore_game_day.sql — a deleted game day can be
-- brought back, and a day with real results will not go quietly (TASK-91).
--
-- On 2026-08-26 a live tournament was deleted in prod by accident: 18 matches,
-- 13 of them already scored, gone in one call. The project is on the Supabase
-- free plan, so there was no PITR and no backup to restore from; the WAL had
-- already been recycled. The rows were still sitting in the heap as dead tuples
-- and were still unrecoverable, because reading them needs a superuser the
-- hosted plan does not hand out. An evening of badminton was simply lost.
--
-- The UI already asked "Confirm delete" and the accident happened anyway. A
-- generic confirm is answered on reflex, so this adds two things that a reflex
-- cannot defeat:
--
--   1. Deleting a day that has scored matches now fails unless the caller is
--      explicit about it. Nothing about the shape of the day is guessed: the
--      count of scored matches goes in the error so the UI can say exactly what
--      is about to be lost.
--   2. Every delete archives the whole day first, so there is something to
--      restore from even when the delete was intended and later regretted.
--
-- Why an archive table and not a deleted_at column: match_sessions is queried
-- from about fourteen places across play and ranking. A soft-delete flag would
-- have to be filtered at every one of them, and the cost of missing a single
-- site is a deleted day quietly reappearing in a leaderboard or, worse, in a
-- rating recompute. Moving the rows out keeps every existing query correct by
-- construction — an archived day is simply not in the live tables.
--
-- Deleting an unscored day stays exactly as cheap as it was. That is a real
-- flow, not an accident: it is how a botched draw gets restarted, and it was
-- used correctly an hour before the accident on the same evening.

-- ---------------------------------------------------------------------------
-- The archive
-- ---------------------------------------------------------------------------

-- One row per deleted day. The children live in the payload rather than in
-- mirrored tables because nothing ever queries them while they are archived —
-- they are only ever written whole and read back whole — and a jsonb snapshot
-- does not need its own migration every time a column is added to the live
-- table.
create table if not exists deleted_game_days (
  session_id      uuid primary key,
  club_id         uuid not null references clubs (id) on delete cascade,
  deleted_at      timestamptz not null default now(),
  deleted_by      uuid default auth.uid (),
  -- Denormalised so the UI can list what is recoverable without opening the
  -- payload of every row.
  played_at       timestamptz not null,
  kind            text not null,
  scored_matches  integer not null default 0,
  total_matches   integer not null default 0,
  payload         jsonb not null
);

create index if not exists deleted_game_days_club_deleted_at_idx
  on deleted_game_days (club_id, deleted_at desc);

alter table deleted_game_days enable row level security;

-- Same audience that may delete a day may see and restore one. The writes all
-- happen inside security-definer functions owned by postgres, which bypasses
-- these policies, so no insert or update policy is needed here.
drop policy if exists deleted_game_days_read on deleted_game_days;
create policy deleted_game_days_read on deleted_game_days
  for select to authenticated
  using (is_admin (club_id) or is_matchmaker (club_id));

-- ---------------------------------------------------------------------------
-- delete_game_day
-- ---------------------------------------------------------------------------

-- The signature gains p_force, so the old one has to go rather than be replaced.
-- Dropping first also avoids leaving a one-argument overload behind: with a
-- defaulted second argument, delete_game_day(uuid) still resolves, and keeping
-- both would make every such call ambiguous.
drop function if exists delete_game_day (uuid);

create or replace function delete_game_day (
  p_session_id uuid,
  p_force boolean default false
)
  returns integer
  language plpgsql
  security definer
  set search_path = public, pg_temp
as $$
declare
  v_club    uuid;
  v_session match_sessions%rowtype;
  v_scored  integer;
  v_total   integer;
  e         record;
  n         integer := 0;
begin
  select * into v_session from match_sessions where id = p_session_id;
  if v_session.id is null then
    return 0; -- already gone
  end if;
  v_club := v_session.club_id;

  if not (is_admin (v_club) or is_matchmaker (v_club)) then
    raise exception 'Only a matchmaker or an admin can delete a game day'
      using errcode = 'insufficient_privilege';
  end if;

  select
    count(*) filter (
      where winner is not null or score_a is not null or score_b is not null
    ),
    count(*)
  into v_scored, v_total
  from match_results
  where session_id = p_session_id;

  -- A day nobody has played yet is disposable. A day with results is somebody's
  -- evening, so the caller has to say so on purpose. PT409 is PostgREST's
  -- convention for mapping a raised error onto an HTTP status — this surfaces
  -- as 409 Conflict, which the client can tell apart from the 403 that an
  -- insufficient_privilege raise produces.
  if v_scored > 0 and not p_force then
    raise exception
      'This game day has % scored match(es). Deleting it will remove them.',
      v_scored
      using
        errcode = 'PT409',
        detail  = v_scored::text,
        hint    = 'Pass p_force => true to delete it anyway. It will be archived and can be restored.';
  end if;

  -- Snapshot before anything is touched. If any part of what follows fails the
  -- whole statement rolls back, archive row included, so this can never leave a
  -- half-deleted day with a partial record of it.
  insert into deleted_game_days (
    session_id, club_id, played_at, kind, scored_matches, total_matches, payload
  )
  values (
    p_session_id,
    v_club,
    v_session.played_at,
    v_session.kind,
    coalesce(v_scored, 0),
    coalesce(v_total, 0),
    jsonb_build_object(
      'session', to_jsonb (v_session),
      'match_results', coalesce(
        (select jsonb_agg(to_jsonb (r) order by r.round, r.court)
           from match_results r where r.session_id = p_session_id), '[]'::jsonb),
      'tournament_teams', coalesce(
        (select jsonb_agg(to_jsonb (t))
           from tournament_teams t where t.session_id = p_session_id), '[]'::jsonb),
      'session_attendance', coalesce(
        (select jsonb_agg(to_jsonb (a))
           from session_attendance a where a.session_id = p_session_id), '[]'::jsonb),
      -- Kept for the record only. restore_game_day does not replay these: the
      -- shuttles were genuinely credited back below, and re-debiting a holder
      -- from here would fight with whatever the stock has done since.
      'usage_entries', coalesce(
        (select jsonb_agg(to_jsonb (u))
           from usage_entries u where u.session_id = p_session_id), '[]'::jsonb),
      'usage_items', coalesce(
        (select jsonb_agg(to_jsonb (i))
           from usage_items i
          where i.usage_id in (select id from usage_entries where session_id = p_session_id)),
        '[]'::jsonb)
    )
  )
  on conflict (session_id) do update
    set deleted_at     = now(),
        deleted_by     = auth.uid (),
        played_at      = excluded.played_at,
        kind           = excluded.kind,
        scored_matches = excluded.scored_matches,
        total_matches  = excluded.total_matches,
        payload        = excluded.payload;

  -- Unchanged from TASK-81: if the day did not happen, the shuttles were not
  -- used, so the holder is credited and the reversal is logged before the entry
  -- goes. restore_game_day deliberately does not undo this.
  for e in select id from usage_entries where session_id = p_session_id loop
    perform restore_usage_holdings (e.id);
    delete from usage_entries where id = e.id;
    n := n + 1;
  end loop;

  -- match_results, tournament_teams and session_attendance cascade with the
  -- session.
  delete from match_sessions where id = p_session_id;

  return n;
end;
$$;

revoke all on function delete_game_day (uuid, boolean) from public, anon;
grant execute on function delete_game_day (uuid, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- restore_game_day
-- ---------------------------------------------------------------------------

-- Puts an archived day back, children and all. Returns the number of matches
-- restored so the caller can report something concrete.
create or replace function restore_game_day (p_session_id uuid)
  returns integer
  language plpgsql
  security definer
  set search_path = public, pg_temp
as $$
declare
  v_row      deleted_game_days%rowtype;
  v_restored integer := 0;
begin
  select * into v_row from deleted_game_days where session_id = p_session_id;
  if v_row.session_id is null then
    raise exception 'No archived game day with id %', p_session_id
      using errcode = 'PT404';
  end if;

  if not (is_admin (v_row.club_id) or is_matchmaker (v_row.club_id)) then
    raise exception 'Only a matchmaker or an admin can restore a game day'
      using errcode = 'insufficient_privilege';
  end if;

  -- Refuse rather than merge. If a live day already holds this id then the id
  -- was reused, and writing the archived children underneath it would silently
  -- mix two different evenings together.
  if exists (select 1 from match_sessions where id = p_session_id) then
    raise exception 'Game day % already exists — restore would collide with it',
      p_session_id
      using errcode = 'PT409';
  end if;

  -- Parent first, then children: they all carry session_id foreign keys.
  -- jsonb_populate_recordset maps by column name, so a column added to a live
  -- table since the archive was written simply takes its default here.
  insert into match_sessions
  select * from jsonb_populate_record (null::match_sessions, v_row.payload -> 'session');

  insert into match_results
  select * from jsonb_populate_recordset (null::match_results, v_row.payload -> 'match_results');
  get diagnostics v_restored = row_count;

  insert into tournament_teams
  select * from jsonb_populate_recordset (null::tournament_teams, v_row.payload -> 'tournament_teams');

  insert into session_attendance
  select * from jsonb_populate_recordset (null::session_attendance, v_row.payload -> 'session_attendance');

  -- The day is live again, so the archive copy would only ever go stale.
  delete from deleted_game_days where session_id = p_session_id;

  return v_restored;
end;
$$;

revoke all on function restore_game_day (uuid) from public, anon;
grant execute on function restore_game_day (uuid) to authenticated;
