-- 20260807020000_audit_holding_deletes.sql — no holding disappears unlogged
-- (TASK-82).
--
-- TASK-79 made every stock WRITE go through an audited function, but a holding
-- could still vanish without a trace by another door: holdings.product_id is
-- ON DELETE CASCADE, so deleting a product takes every matchmaker's holding of
-- it with it. Verified on dev — one product deleted, one holding gone, zero
-- inventory_log rows written. Deleting the last purchase batch of a product does
-- the same thing, because that path deletes the product too.
--
-- Logging at each call site would just be the same omission waiting to happen
-- again. A trigger on the delete itself catches every route — the explicit one,
-- the cascade, and any future path — so the audit trail cannot be gone around.
--
-- delete_holding() therefore stops writing its own row: with the trigger it
-- would log twice. Its permission check stays.
create or replace function log_holding_delete ()
  returns trigger
  language plpgsql
  security definer
  set search_path = public, pg_temp
as $$
declare
  prod  record;
  v_pid uuid;
begin
  -- When this fires as part of a product's cascade the product row is already
  -- gone, so referencing it would violate inventory_log's FK and take the whole
  -- delete down with it. Null the reference and lean on the denormalised label,
  -- which is what that column is for.
  select brand, model into prod from products where id = old.product_id;
  v_pid := case when found then old.product_id else null end;

  insert into inventory_log (
    club_id, actor_user_id, actor_name, holder_id, product_id,
    holder_name, product_label, action,
    barrels_delta, loose_delta, barrels_after, loose_after, note
  ) values (
    old.club_id, auth.uid(), stock_actor_name (), old.holder_id, v_pid,
    coalesce((select nickname from player_profiles where id = old.holder_id), 'Unknown'),
    -- The product may already be gone when this fires as part of its cascade,
    -- so fall back to whatever the log last called it rather than losing the name.
    coalesce(
      nullif(trim(coalesce(prod.brand, '') || ' ' || coalesce(prod.model, '')), ''),
      (select product_label from inventory_log
        where product_id = old.product_id order by occurred_at desc limit 1),
      'Removed product'
    ),
    'adjust',
    -old.barrels, -old.loose_shuttles, 0, 0,
    'Stock record removed'
  );
  return old;
end;
$$;

drop trigger if exists holdings_log_delete on holdings;
create trigger holdings_log_delete
  before delete on holdings
  for each row execute function log_holding_delete ();

-- The trigger now writes this row, so the function must not write it too.
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
begin
  select club_id into v_club from products where id = p_product_id;
  if v_club is null then raise exception 'No such product'; end if;

  if not is_admin (v_club) then
    raise exception 'Only an admin can remove a stock record'
      using errcode = 'insufficient_privilege';
  end if;

  -- holdings_log_delete writes the audit row for whatever this removes.
  delete from holdings where product_id = p_product_id and holder_id = p_holder_id;
end;
$$;
