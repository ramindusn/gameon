-- 20260809010000_product_shuttle_costs.sql — let a matchmaker see what a
-- shuttle costs, without letting them read the club's spending (TASK-85).
--
-- The game-day usage card wants to show what a day cost. The figure comes from
-- purchases.price_per_barrel, and `purchases` is admin-only (purchases_admin,
-- is_admin(club_id)) — deliberately, since that table is the club's spend:
-- every batch, every price, every date.
--
-- Opening the table to matchmakers to get one derived number would give away
-- far more than the question needs. This returns only the unit cost per
-- product, to a matchmaker or an admin of that club.
--
-- The formula mirrors costPerShuttle() in @gameon/domain exactly — weighted
-- average barrel price across every batch, divided by shuttles per barrel — so
-- the card and the admin's fund figures cannot drift apart:
--
--   avgBarrelPrice = sum(barrels * price) / sum(barrels)
--   costPerShuttle = avgBarrelPrice / shuttles_per_barrel
--
-- Products with no purchase batches, or a nonsense barrel size, cost 0 rather
-- than dividing by zero — same as the TypeScript, which returns 0 in both cases.
create or replace function product_shuttle_costs ()
  returns table (product_id uuid, cost_per_shuttle numeric)
  language plpgsql
  security definer
  set search_path = public, pg_temp
as $$
declare
  v_club uuid;
begin
  -- One club per install today; take the caller's from their profile rather
  -- than trusting an argument, so this cannot be pointed at another club.
  select pp.club_id into v_club
    from player_profiles pp
   where pp.user_id = auth.uid()
   limit 1;

  if v_club is null then
    return;
  end if;

  if not (is_admin (v_club) or is_matchmaker (v_club)) then
    raise exception 'Only a matchmaker or an admin can see shuttle costs'
      using errcode = 'insufficient_privilege';
  end if;

  return query
  select p.id,
         case
           when p.shuttles_per_barrel <= 0 then 0::numeric
           when coalesce(sum(pu.barrels), 0) <= 0 then 0::numeric
           else sum(pu.barrels * pu.price_per_barrel)::numeric
                / sum(pu.barrels)::numeric
                / p.shuttles_per_barrel::numeric
         end
    from products p
    left join purchases pu on pu.product_id = p.id
   where p.club_id = v_club
   group by p.id, p.shuttles_per_barrel;
end;
$$;

revoke all on function product_shuttle_costs () from public;
grant execute on function product_shuttle_costs () to authenticated;
