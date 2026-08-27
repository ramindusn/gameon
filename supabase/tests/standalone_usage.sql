-- Verification harness for record_standalone_usage / record_game_day_usage
-- (TASK-95). Self-contained and self-rolling-back: it ends by raising
-- ROLLBACK_SENTINEL, so nothing it does is committed. Run against dev.
--
--   psql "$DEV_DATABASE_URL" -f supabase/tests/standalone_usage.sql
--
-- Impersonates real users via request.jwt.claims, because is_admin() and
-- is_matchmaker() both read auth.uid(), which is null on a direct connection.
--
-- Deducts a single shuttle from an existing holding rather than creating one:
-- a trigger refuses direct increases to holdings, so stock cannot be conjured.
do $$
declare
  v_club     uuid;
  v_admin    uuid;
  v_mm       uuid;
  v_holder   uuid;
  v_product  uuid;
  v_before   integer;
  v_after    integer;
  v_entry    uuid;
  v_sess     uuid := gen_random_uuid ();
  v_note     text;
  v_session  uuid;
  v_log      text;
  v_err      text;
begin
  -- An existing holding with something in it, and the club it belongs to.
  select h.holder_id, h.product_id, p.club_id
    into v_holder, v_product, v_club
  from holdings h
  join products p on p.id = h.product_id
  where h.barrels * greatest(p.shuttles_per_barrel, 1) + h.loose_shuttles >= 1
  limit 1;
  if v_holder is null then
    raise exception 'no holding with stock on this project — cannot verify';
  end if;

  select user_id into v_admin from admins where club_id = v_club limit 1;
  if v_admin is null then raise exception 'no admin for club % — cannot verify', v_club; end if;

  raise notice 'club %, admin %, holder %', v_club, v_admin, v_holder;

  select h.barrels * greatest(p.shuttles_per_barrel, 1) + h.loose_shuttles
    into v_before
  from holdings h join products p on p.id = h.product_id
  where h.holder_id = v_holder and h.product_id = v_product;

  perform set_config('request.jwt.claims', json_build_object('sub', v_admin)::text, true);

  -- 1. an admin can record usage with no game day at all
  v_entry := record_standalone_usage (
    v_club,
    jsonb_build_array(jsonb_build_object(
      'product_id', v_product, 'holder_id', v_holder, 'shuttles_used', 1)),
    now() - interval '1 day',
    'Tue session, game day was deleted'
  );
  select session_id, note into v_session, v_note from usage_entries where id = v_entry;
  if v_session is not null then
    raise exception 'FAIL 1: standalone entry got a session_id';
  end if;
  if v_note is distinct from 'Tue session, game day was deleted' then
    raise exception 'FAIL 1b: note not stored, got %', coalesce(v_note, '<null>');
  end if;
  raise notice 'PASS 1 standalone entry written, session_id null, note kept';

  -- 2. it actually came off the holder's stock
  select h.barrels * greatest(p.shuttles_per_barrel, 1) + h.loose_shuttles
    into v_after
  from holdings h join products p on p.id = h.product_id
  where h.holder_id = v_holder and h.product_id = v_product;
  if v_after <> v_before - 1 then
    raise exception 'FAIL 2: stock went % -> %, expected one less', v_before, v_after;
  end if;
  raise notice 'PASS 2 deducted from the holder: % -> %', v_before, v_after;

  -- 3. the audit row marks it as having no game day
  select note into v_log from inventory_log
   where holder_id = v_holder and product_id = v_product and action = 'usage'
   order by occurred_at desc limit 1;
  if v_log not like '%no game day%' then
    raise exception 'FAIL 3: audit note does not mark it standalone, got %', v_log;
  end if;
  raise notice 'PASS 3 audit row reads: %', v_log;

  -- 4. an empty entry is refused rather than silently recording nothing
  begin
    perform record_standalone_usage (v_club, '[]'::jsonb, now(), 'nothing');
    raise exception 'FAIL 4: empty standalone entry accepted';
  exception when others then
    get stacked diagnostics v_err = message_text;
    if v_err like 'FAIL 4%' then raise; end if;
    raise notice 'PASS 4 empty entry refused: %', v_err;
  end;

  -- 5. the existing game-day flow still works, and leaves note null
  insert into match_sessions (id, club_id, status, mode, rounds, played_at, kind, hidden)
  values (v_sess, v_club, 'finished', 'open', 1, now(), 'casual', false);
  v_entry := record_game_day_usage (
    v_sess,
    jsonb_build_array(jsonb_build_object(
      'product_id', v_product, 'holder_id', v_holder, 'shuttles_used', 1))
  );
  select session_id, note into v_session, v_note from usage_entries where id = v_entry;
  if v_session is distinct from v_sess then
    raise exception 'FAIL 5: game-day entry lost its session';
  end if;
  if v_note is not null then
    raise exception 'FAIL 5b: game-day entry got a note, expected null';
  end if;
  raise notice 'PASS 5 game-day usage unchanged, note null';

  -- 6. a matchmaker who is not an admin cannot record a standalone entry
  select pp.user_id into v_mm
  from player_profiles pp
  where pp.club_id = v_club and pp.is_matchmaker and pp.user_id is not null
    and not exists (select 1 from admins a where a.user_id = pp.user_id and a.club_id = v_club)
  limit 1;
  if v_mm is null then
    raise notice 'SKIP 6 no non-admin matchmaker on this project to test the guard';
  else
    perform set_config('request.jwt.claims', json_build_object('sub', v_mm)::text, true);
    begin
      perform record_standalone_usage (
        v_club,
        jsonb_build_array(jsonb_build_object(
          'product_id', v_product, 'holder_id', v_holder, 'shuttles_used', 1)),
        now(), 'should not work');
      raise exception 'FAIL 6: a non-admin matchmaker recorded a standalone entry';
    exception when insufficient_privilege then
      raise notice 'PASS 6 non-admin matchmaker refused';
    end;
  end if;

  raise notice 'ALL CHECKS PASSED';
  raise exception 'ROLLBACK_SENTINEL: verification complete, discarding all changes';
end $$;
