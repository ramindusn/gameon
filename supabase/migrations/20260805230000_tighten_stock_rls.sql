-- 20260805230000_tighten_stock_rls.sql — close three gaps in the stock policies
-- (TASK-78). None was reachable by an outsider: signed-out access to every stock
-- table is already denied. All three are "a matchmaker going around the UI".
--
--   1. usage_items INSERT only checked is_matchmaker, while UPDATE and DELETE
--      both check the parent entry's recorded_by — so a matchmaker could add
--      items onto somebody else's usage entry.
--   2. inventory_log INSERT only checked is_matchmaker, so a matchmaker could
--      append audit rows naming anyone as the actor. The log is append-only, so
--      a forged row could not then be removed.
--   3. holdings UPDATE let a matchmaker set ANY holder's stock to ANY value.
--      Drawing another matchmaker's barrels down is deliberate (barrels get
--      shared on a game day), but nothing stopped stock being invented, and
--      nothing in the database required the change to be logged at all.

-- ---------------------------------------------------------------------------
-- 1. usage_items: an item belongs to its entry, so inserting one means owning
--    the entry. Matches the UPDATE/DELETE policies that were already correct.
-- ---------------------------------------------------------------------------
drop policy if exists usage_items_matchmaker_insert on usage_items;
create policy usage_items_matchmaker_insert on usage_items for insert to authenticated
  with check (
    is_matchmaker (club_id)
    and exists (
      select 1 from usage_entries e
      where e.id = usage_items.usage_id and e.recorded_by = (select auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- 2. inventory_log: a matchmaker may only append entries as themselves. Admins
--    keep the broader policy — they record on other people's behalf, which is
--    the whole point of the admin stock screens.
-- ---------------------------------------------------------------------------
drop policy if exists inventory_log_matchmaker_insert on inventory_log;
create policy inventory_log_matchmaker_insert on inventory_log for insert to authenticated
  with check (is_matchmaker (club_id) and actor_user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- 3. holdings: a matchmaker may draw stock down, never up.
--
-- RLS cannot express this — WITH CHECK sees only the new row, so it cannot
-- compare against the old one. A trigger can. Admins are exempt: they allocate,
-- transfer and correct, all of which legitimately increase a holding.
--
-- Giving shuttles back when usage is deleted also increases a holding, so that
-- path goes through restore_usage_holdings() below rather than a direct update.
-- ---------------------------------------------------------------------------
create or replace function holdings_no_increase_by_matchmaker ()
  returns trigger
  language plpgsql
  security definer
  set search_path = public, pg_temp
as $$
declare
  per       integer;
  old_total integer;
  new_total integer;
begin
  -- The audited reversal below raises stock deliberately. It runs as a
  -- security-definer function, but auth.uid() is still the matchmaker, so
  -- is_admin() would be false here and the credit would be refused — verified
  -- against dev before this guard existed. It announces itself instead.
  if is_admin (new.club_id)
     or coalesce(current_setting('app.usage_reversal', true), '') = '1' then
    return new;
  end if;

  select greatest(shuttles_per_barrel, 1) into per from products where id = new.product_id;
  per := coalesce(per, 1);
  old_total := old.barrels * per + old.loose_shuttles;
  new_total := new.barrels * per + new.loose_shuttles;

  if new_total > old_total then
    raise exception
      'A matchmaker can only draw stock down (% -> % shuttles). Ask an admin to allocate or transfer.',
      old_total, new_total
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists holdings_matchmaker_drawdown_only on holdings;
create trigger holdings_matchmaker_drawdown_only
  before update on holdings
  for each row execute function holdings_no_increase_by_matchmaker ();

-- ---------------------------------------------------------------------------
-- Returning a deleted game day's shuttles, as one audited step.
--
-- This was three client-side writes (read items, update holdings, insert log),
-- which meant the audit entry was advisory: nothing made the caller write it.
-- As a security-definer function the credit and its log entry are one
-- transaction that cannot be half-done or skipped, and it is the only way a
-- matchmaker can increase a holding — through a path that checks they owned the
-- entry in the first place.
--
-- holder_id is null on entries written before per-holder stock existed. Those
-- never came out of a holding, so there is correctly nothing to give back.
-- ---------------------------------------------------------------------------
create or replace function restore_usage_holdings (p_usage_id uuid)
  returns integer
  language plpgsql
  security definer
  set search_path = public, pg_temp
as $$
declare
  v_entry   record;
  it        record;
  per       integer;
  held      record;
  total     integer;
  nb        integer;
  nl        integer;
  v_actor   text;
  n         integer := 0;
begin
  select * into v_entry from usage_entries where id = p_usage_id;
  if not found then
    return 0;
  end if;

  if not (is_admin (v_entry.club_id)
          or (is_matchmaker (v_entry.club_id) and v_entry.recorded_by = auth.uid())) then
    raise exception 'Not allowed to reverse this usage entry'
      using errcode = 'insufficient_privilege';
  end if;

  select coalesce(nickname, 'Unknown') into v_actor
    from player_profiles where user_id = auth.uid();

  -- Lets the drawdown-only trigger through for this transaction only. Set after
  -- the permission check above, so it can never be reached without one.
  perform set_config('app.usage_reversal', '1', true);

  for it in
    select i.product_id, i.holder_id, i.shuttles_used, i.club_id,
           p.brand, p.model, greatest(p.shuttles_per_barrel, 1) as spb,
           pr.nickname as holder_name
      from usage_items i
      join products p on p.id = i.product_id
      left join player_profiles pr on pr.id = i.holder_id
     where i.usage_id = p_usage_id and i.holder_id is not null and i.shuttles_used > 0
  loop
    per := it.spb;
    select barrels, loose_shuttles into held
      from holdings where product_id = it.product_id and holder_id = it.holder_id;
    if not found then
      continue; -- the allocation is gone; nothing to credit it back to
    end if;

    -- Re-derive from the shuttle total so returned loose shuttles roll back up
    -- into whole barrels, the same way the deduction breaks them down.
    total := held.barrels * per + held.loose_shuttles + it.shuttles_used;
    nb := total / per;
    nl := total % per;

    update holdings
       set barrels = nb, loose_shuttles = nl, updated_at = now()
     where product_id = it.product_id and holder_id = it.holder_id;

    insert into inventory_log (
      club_id, actor_user_id, actor_name, holder_id, product_id,
      holder_name, product_label, action,
      barrels_delta, loose_delta, barrels_after, loose_after, note
    ) values (
      it.club_id, auth.uid(), v_actor, it.holder_id, it.product_id,
      coalesce(it.holder_name, 'Unknown'), trim(it.brand || ' ' || it.model), 'adjust',
      nb - held.barrels, nl - held.loose_shuttles, nb, nl,
      it.shuttles_used || ' shuttles returned — game-day usage deleted'
    );
    n := n + 1;
  end loop;

  return n;
end;
$$;

revoke all on function restore_usage_holdings (uuid) from public, anon;
grant execute on function restore_usage_holdings (uuid) to authenticated;
