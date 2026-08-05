-- 20260805260000_audited_stock_functions.sql — make the stock audit trail
-- un-skippable (TASK-79).
--
-- TASK-78 closed the permission gaps, but four writers still did their holdings
-- write and their inventory_log row as two separate client calls. Nothing in the
-- database tied them together, so the log was advisory: a caller going around
-- the UI could change stock and leave no trace, and a half-failed pair could
-- leave stock changed with no entry.
--
-- Each operation is now one security-definer function that does both in a single
-- transaction, with the permission check inside it. restore_usage_holdings()
-- (TASK-78) already worked this way; these follow it.
--
-- Denormalised labels (holder_name, product_label, actor_name) are now read from
-- the database rather than passed in, so the history cannot disagree with the
-- rows it describes.
--
-- With every path routed through a function, authenticated no longer needs to
-- write holdings or inventory_log directly — those grants are revoked at the
-- end, which is what actually makes the trail un-skippable. The drawdown trigger
-- from TASK-78 stays as a backstop.

-- ---------------------------------------------------------------------------
-- Shared helper: the signed-in person's display name for the audit trail.
-- ---------------------------------------------------------------------------
create or replace function stock_actor_name ()
  returns text
  language sql
  stable
  security definer
  set search_path = public, pg_temp
as $$
  select coalesce(
    (select nickname from player_profiles where user_id = auth.uid()),
    (select m.name from members m
       join auth.users u on lower(u.email) = lower(m.email)
      where u.id = auth.uid() limit 1),
    'An admin'
  );
$$;

-- ---------------------------------------------------------------------------
-- Allocate / adjust a matchmaker's holding. Admin only — matchmakers draw stock
-- down through usage, they do not set levels.
-- ---------------------------------------------------------------------------
create or replace function change_stock (
  p_holder_id  uuid,
  p_product_id uuid,
  p_barrels    integer,
  p_loose      integer,
  p_action     text,
  p_note       text default null
) returns void
  language plpgsql
  security definer
  set search_path = public, pg_temp
as $$
declare
  v_club uuid;
  prev_b integer := 0;
  prev_l integer := 0;
  prod   record;
  v_holder text;
begin
  select club_id, brand, model into prod from products where id = p_product_id;
  if not found then raise exception 'No such product'; end if;
  v_club := prod.club_id;

  if not is_admin (v_club) then
    raise exception 'Only an admin can allocate or correct stock'
      using errcode = 'insufficient_privilege';
  end if;
  if p_action not in ('allocate', 'adjust') then
    raise exception 'change_stock handles allocate and adjust only, got %', p_action;
  end if;
  if p_barrels < 0 or p_loose < 0 then
    raise exception 'Stock cannot be negative';
  end if;

  select nickname into v_holder from player_profiles where id = p_holder_id;
  if v_holder is null then raise exception 'No such matchmaker'; end if;

  select barrels, loose_shuttles into prev_b, prev_l
    from holdings where product_id = p_product_id and holder_id = p_holder_id;
  prev_b := coalesce(prev_b, 0);
  prev_l := coalesce(prev_l, 0);

  insert into holdings (club_id, product_id, holder_id, barrels, loose_shuttles, updated_at)
  values (v_club, p_product_id, p_holder_id, p_barrels, p_loose, now())
  on conflict (product_id, holder_id) do update
    set barrels = excluded.barrels,
        loose_shuttles = excluded.loose_shuttles,
        updated_at = now();

  insert into inventory_log (
    club_id, actor_user_id, actor_name, holder_id, product_id,
    holder_name, product_label, action,
    barrels_delta, loose_delta, barrels_after, loose_after, note
  ) values (
    v_club, auth.uid(), stock_actor_name (), p_holder_id, p_product_id,
    v_holder, trim(prod.brand || ' ' || prod.model), p_action,
    p_barrels - prev_b, p_loose - prev_l, p_barrels, p_loose, p_note
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Hand barrels from one matchmaker to another. Both sides move together or not
-- at all — as two client calls, the giver could be debited without the receiver
-- being credited.
-- ---------------------------------------------------------------------------
create or replace function transfer_stock (
  p_product_id uuid,
  p_from_id    uuid,
  p_to_id      uuid,
  p_barrels    integer,
  p_loose      integer,
  p_note       text default null
) returns void
  language plpgsql
  security definer
  set search_path = public, pg_temp
as $$
declare
  v_club uuid;
  prod   record;
  from_b integer;
  from_l integer;
  to_b   integer := 0;
  to_l   integer := 0;
  from_n text;
  to_n   text;
  label  text;
  actor  text;
begin
  select club_id, brand, model into prod from products where id = p_product_id;
  if not found then raise exception 'No such product'; end if;
  v_club := prod.club_id;
  label  := trim(prod.brand || ' ' || prod.model);

  if not is_admin (v_club) then
    raise exception 'Only an admin can transfer stock'
      using errcode = 'insufficient_privilege';
  end if;
  if p_from_id = p_to_id then raise exception 'Pick two different matchmakers'; end if;
  if p_barrels < 0 or p_loose < 0 then raise exception 'Amounts cannot be negative'; end if;
  if p_barrels = 0 and p_loose = 0 then raise exception 'Nothing to transfer'; end if;

  select nickname into from_n from player_profiles where id = p_from_id;
  select nickname into to_n   from player_profiles where id = p_to_id;
  if from_n is null or to_n is null then raise exception 'No such matchmaker'; end if;

  select barrels, loose_shuttles into from_b, from_l
    from holdings where product_id = p_product_id and holder_id = p_from_id;
  if from_b is null then raise exception '% is not holding this product', from_n; end if;
  if from_b < p_barrels or from_l < p_loose then
    raise exception '% only holds % barrels and % loose', from_n, from_b, from_l;
  end if;

  select barrels, loose_shuttles into to_b, to_l
    from holdings where product_id = p_product_id and holder_id = p_to_id;
  to_b := coalesce(to_b, 0);
  to_l := coalesce(to_l, 0);

  update holdings set barrels = from_b - p_barrels,
                      loose_shuttles = from_l - p_loose,
                      updated_at = now()
   where product_id = p_product_id and holder_id = p_from_id;

  insert into holdings (club_id, product_id, holder_id, barrels, loose_shuttles, updated_at)
  values (v_club, p_product_id, p_to_id, to_b + p_barrels, to_l + p_loose, now())
  on conflict (product_id, holder_id) do update
    set barrels = excluded.barrels,
        loose_shuttles = excluded.loose_shuttles,
        updated_at = now();

  actor := stock_actor_name ();

  insert into inventory_log (
    club_id, actor_user_id, actor_name, holder_id, product_id, holder_name,
    product_label, action, barrels_delta, loose_delta, barrels_after, loose_after, note
  ) values
    (v_club, auth.uid(), actor, p_from_id, p_product_id, from_n, label, 'transfer',
     -p_barrels, -p_loose, from_b - p_barrels, from_l - p_loose,
     coalesce(p_note, 'Transferred to ' || to_n)),
    (v_club, auth.uid(), actor, p_to_id, p_product_id, to_n, label, 'transfer',
     p_barrels, p_loose, to_b + p_barrels, to_l + p_loose,
     'Received from ' || from_n);
end;
$$;

-- ---------------------------------------------------------------------------
-- Remove a matchmaker's stock record. The row goes; the history stays.
-- ---------------------------------------------------------------------------
create or replace function delete_holding (
  p_holder_id  uuid,
  p_product_id uuid,
  p_note       text default null
) returns void
  language plpgsql
  security definer
  set search_path = public, pg_temp
as $$
declare
  v_club uuid;
  prod   record;
  prev   record;
  v_holder text;
begin
  select club_id, brand, model into prod from products where id = p_product_id;
  if not found then raise exception 'No such product'; end if;
  v_club := prod.club_id;

  if not is_admin (v_club) then
    raise exception 'Only an admin can remove a stock record'
      using errcode = 'insufficient_privilege';
  end if;

  select barrels, loose_shuttles into prev
    from holdings where product_id = p_product_id and holder_id = p_holder_id;
  if prev is null then return; end if;

  select nickname into v_holder from player_profiles where id = p_holder_id;

  insert into inventory_log (
    club_id, actor_user_id, actor_name, holder_id, product_id,
    holder_name, product_label, action,
    barrels_delta, loose_delta, barrels_after, loose_after, note
  ) values (
    v_club, auth.uid(), stock_actor_name (), p_holder_id, p_product_id,
    coalesce(v_holder, 'Unknown'), trim(prod.brand || ' ' || prod.model), 'adjust',
    -prev.barrels, -prev.loose_shuttles, 0, 0,
    coalesce(p_note, 'Removed the stock record')
  );

  delete from holdings where product_id = p_product_id and holder_id = p_holder_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Record a game day's usage: the entry, its items, the drawdown and the audit
-- rows as one step. This is the only one of the four a matchmaker can reach.
--
-- p_lines: [{"product_id": uuid, "holder_id": uuid, "shuttles_used": int}, …]
-- An empty array is the explicit "no club stock was used" answer: the entry is
-- written so the day counts as recorded, and nothing is deducted.
-- ---------------------------------------------------------------------------
create or replace function record_game_day_usage (
  p_session_id  uuid,
  p_lines       jsonb,
  p_occurred_at timestamptz default now()
) returns uuid
  language plpgsql
  security definer
  set search_path = public, pg_temp
as $$
declare
  v_club  uuid;
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
  select club_id into v_club from match_sessions where id = p_session_id;
  if v_club is null then raise exception 'No such game day'; end if;

  if not (is_admin (v_club) or is_matchmaker (v_club)) then
    raise exception 'Only a matchmaker or an admin can record usage'
      using errcode = 'insufficient_privilege';
  end if;

  actor := stock_actor_name ();

  insert into usage_entries (club_id, session_id, recorded_by, logged_by, occurred_at)
  values (v_club, p_session_id, auth.uid(), actor, p_occurred_at)
  returning id into v_entry;

  for ln in
    select (e ->> 'product_id')::uuid   as product_id,
           (e ->> 'holder_id')::uuid    as holder_id,
           (e ->> 'shuttles_used')::int as shuttles_used
      from jsonb_array_elements(coalesce(p_lines, '[]'::jsonb)) e
  loop
    if ln.shuttles_used <= 0 then continue; end if;

    select brand, model, greatest(shuttles_per_barrel, 1) as spb into prod
      from products where id = ln.product_id and club_id = v_club;
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
    values (v_club, v_entry, ln.product_id, ln.shuttles_used, ln.holder_id);

    update holdings set barrels = nb, loose_shuttles = nl, updated_at = now()
     where product_id = ln.product_id and holder_id = ln.holder_id;

    insert into inventory_log (
      club_id, actor_user_id, actor_name, holder_id, product_id,
      holder_name, product_label, action,
      barrels_delta, loose_delta, barrels_after, loose_after, note
    ) values (
      v_club, auth.uid(), actor, ln.holder_id, ln.product_id,
      coalesce((select nickname from player_profiles where id = ln.holder_id), 'Unknown'),
      trim(prod.brand || ' ' || prod.model), 'usage',
      nb - held.barrels, nl - held.loose_shuttles, nb, nl,
      ln.shuttles_used || ' shuttles used on a game day'
    );
  end loop;

  return v_entry;
end;
$$;

-- ---------------------------------------------------------------------------
-- Only these functions may write stock now. This is the part that makes the
-- trail un-skippable: with no direct grant, a change cannot be made without the
-- log entry that goes with it. Reads are untouched.
-- ---------------------------------------------------------------------------
revoke insert, update, delete, truncate on holdings      from authenticated, anon;
revoke insert                          on inventory_log from authenticated, anon;

revoke all on function stock_actor_name () from public, anon;
revoke all on function change_stock (uuid, uuid, integer, integer, text, text) from public, anon;
revoke all on function transfer_stock (uuid, uuid, uuid, integer, integer, text) from public, anon;
revoke all on function delete_holding (uuid, uuid, text) from public, anon;
revoke all on function record_game_day_usage (uuid, jsonb, timestamptz) from public, anon;

grant execute on function change_stock (uuid, uuid, integer, integer, text, text) to authenticated;
grant execute on function transfer_stock (uuid, uuid, uuid, integer, integer, text) to authenticated;
grant execute on function delete_holding (uuid, uuid, text) to authenticated;
grant execute on function record_game_day_usage (uuid, jsonb, timestamptz) to authenticated;
