-- 20260827020000_standalone_usage.sql — shuttles can be used on an evening that
-- has no game day (TASK-95).
--
-- record_game_day_usage() takes the club from the game day itself:
--
--   select club_id into v_club from match_sessions where id = p_session_id;
--   if v_club is null then raise exception 'No such game day'; end if;
--
-- so usage without a game day has been impossible, even though
-- usage_entries.session_id has always been nullable. On 2026-08-26 that gap
-- cost real money: the evening was played, club shuttles were used, the game
-- day was then deleted by accident, and with it went the only thing the usage
-- could have been attached to. The shuttles were gone from the holder's stock
-- with no way to say so.
--
-- The fix is only about where the club comes from. Everything else — checking
-- the holder actually has the shuttles, deducting them, writing the audit row —
-- is identical, so it moves into one worker that both entry points share rather
-- than being copied and left to drift.
--
-- Standalone entries are admin-only. A matchmaker records against the day they
-- just played, which is the flow that keeps the usage list honest; an entry
-- attached to nothing is a correction, and corrections belong with the admin.

-- A date alone does not say what an entry was for. A game-day entry does not
-- need one — it has the day — so this stays null there and is asked for only
-- when there is nothing else to identify the entry by.
alter table usage_entries add column if not exists note text;

comment on column usage_entries.note is
  'Free-text label, used for entries with no game day (TASK-95). Null otherwise.';

-- ---------------------------------------------------------------------------
-- The shared worker
-- ---------------------------------------------------------------------------

-- Deliberately NOT callable by clients: it takes the club as an argument and
-- does no authorisation of its own, trusting the caller to have done it. The
-- two public wrappers below are security definer and owned by postgres, so they
-- reach it without any client needing rights on it.
create or replace function record_usage_lines (
  p_club        uuid,
  p_session_id  uuid,
  p_lines       jsonb,
  p_occurred_at timestamptz,
  p_note        text
)
  returns uuid
  language plpgsql
  security definer
  set search_path = public, pg_temp
as $$
declare
  v_entry uuid;
  actor   text;
  ln      record;
  prod    record;
  held    record;
  per     integer;
  total   integer;
  nb      integer;
  nl      integer;
begin
  actor := stock_actor_name ();

  insert into usage_entries (club_id, session_id, recorded_by, logged_by, occurred_at, note)
  values (p_club, p_session_id, auth.uid(), actor, p_occurred_at, nullif(btrim(coalesce(p_note, '')), ''))
  returning id into v_entry;

  for ln in
    select (e ->> 'product_id')::uuid   as product_id,
           (e ->> 'holder_id')::uuid    as holder_id,
           (e ->> 'shuttles_used')::int as shuttles_used
      from jsonb_array_elements(coalesce(p_lines, '[]'::jsonb)) e
  loop
    if ln.shuttles_used <= 0 then continue; end if;

    select brand, model, greatest(shuttles_per_barrel, 1) as spb into prod
      from products where id = ln.product_id and club_id = p_club;
    if not found then raise exception 'No such product'; end if;
    per := prod.spb;

    select barrels, loose_shuttles into held
      from holdings where product_id = ln.product_id and holder_id = ln.holder_id;
    if not found then raise exception 'That matchmaker is not holding this product'; end if;

    total := held.barrels * per + held.loose_shuttles;
    if total < ln.shuttles_used then
      raise exception 'Only % shuttles of % are held, % were entered',
        total, trim(prod.brand || ' ' || prod.model), ln.shuttles_used;
    end if;
    total := total - ln.shuttles_used;
    nb := total / per;
    nl := total % per;

    insert into usage_items (club_id, usage_id, product_id, shuttles_used, holder_id)
    values (p_club, v_entry, ln.product_id, ln.shuttles_used, ln.holder_id);

    update holdings set barrels = nb, loose_shuttles = nl, updated_at = now()
     where product_id = ln.product_id and holder_id = ln.holder_id;

    insert into inventory_log (
      club_id, actor_user_id, actor_name, holder_id, product_id,
      holder_name, product_label, action,
      barrels_delta, loose_delta, barrels_after, loose_after, note
    ) values (
      p_club, auth.uid(), actor, ln.holder_id, ln.product_id,
      coalesce((select nickname from player_profiles where id = ln.holder_id), 'Unknown'),
      trim(prod.brand || ' ' || prod.model), 'usage',
      nb - held.barrels, nl - held.loose_shuttles, nb, nl,
      -- The audit row says which of the two this was, so a standalone
      -- correction is never mistaken for a day that was recorded normally.
      ln.shuttles_used || ' shuttles used'
        || case
             when p_session_id is not null then ' on a game day'
             else coalesce(' (no game day: ' || nullif(btrim(coalesce(p_note, '')), '') || ')',
                           ' (no game day)')
           end
    );
  end loop;

  return v_entry;
end;
$$;

revoke all on function record_usage_lines (uuid, uuid, jsonb, timestamptz, text)
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Game-day usage — unchanged behaviour, now delegating
-- ---------------------------------------------------------------------------

create or replace function record_game_day_usage (
  p_session_id  uuid,
  p_lines       jsonb,
  p_occurred_at timestamptz default now()
)
  returns uuid
  language plpgsql
  security definer
  set search_path = public, pg_temp
as $$
declare
  v_club uuid;
begin
  select club_id into v_club from match_sessions where id = p_session_id;
  if v_club is null then raise exception 'No such game day'; end if;

  if not (is_admin (v_club) or is_matchmaker (v_club)) then
    raise exception 'Only a matchmaker or an admin can record usage'
      using errcode = 'insufficient_privilege';
  end if;

  return record_usage_lines (v_club, p_session_id, p_lines, p_occurred_at, null);
end;
$$;

revoke all on function record_game_day_usage (uuid, jsonb, timestamptz) from public, anon;
grant execute on function record_game_day_usage (uuid, jsonb, timestamptz) to authenticated;

-- ---------------------------------------------------------------------------
-- Usage with no game day
-- ---------------------------------------------------------------------------

-- The club is passed rather than inferred: an admin of more than one club would
-- otherwise have it guessed for them, and guessing which club's stock to take
-- shuttles out of is not a thing to get wrong quietly.
create or replace function record_standalone_usage (
  p_club_id     uuid,
  p_lines       jsonb,
  p_occurred_at timestamptz default now(),
  p_note        text default null
)
  returns uuid
  language plpgsql
  security definer
  set search_path = public, pg_temp
as $$
begin
  if not is_admin (p_club_id) then
    raise exception 'Only an admin can record usage with no game day'
      using errcode = 'insufficient_privilege';
  end if;

  -- Nothing to record is a mistake worth naming: an empty entry would deduct
  -- nothing while looking like it had. The "none" marker that game days use
  -- exists to close off a day, and a standalone entry has no day to close.
  if coalesce(jsonb_array_length(coalesce(p_lines, '[]'::jsonb)), 0) = 0 then
    raise exception 'Enter how many shuttles were used';
  end if;

  return record_usage_lines (p_club_id, null, p_lines, p_occurred_at, p_note);
end;
$$;

revoke all on function record_standalone_usage (uuid, jsonb, timestamptz, text) from public, anon;
grant execute on function record_standalone_usage (uuid, jsonb, timestamptz, text) to authenticated;
