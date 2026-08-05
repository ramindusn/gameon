-- 20260804030000_game_day_usage.sql — game-day shuttle usage (TASK-69.8).
--
-- Usage was a club-level record with no link to a game day, writable only by
-- admins, that drew down the old club-wide pool. It now has to:
--   * belong to a specific game day (recorded before finishing, or added after)
--   * name WHOSE stock the shuttles came out of
--   * be writable by the matchmaker who ran the day
--
-- Columns:
--   usage_entries.session_id  — the game day this usage belongs to
--   usage_entries.recorded_by — the matchmaker who entered it; they may edit
--                               only their own entries
--   usage_items.holder_id     — the matchmaker whose barrels were drawn down.
--                               Defaults to whoever recorded it, but is
--                               deliberately overridable: barrels get shared on
--                               the day, so the person running it is not always
--                               the person whose stock was opened.

alter table usage_entries
  add column session_id  uuid references match_sessions (id) on delete set null,
  add column recorded_by uuid references auth.users (id) on delete set null;

alter table usage_items
  add column holder_id uuid references player_profiles (id) on delete set null;

create index usage_entries_session_idx on usage_entries (session_id);
create index usage_items_holder_idx    on usage_items (holder_id);

-- ---------------------------------------------------------------------------
-- RLS. Admins keep full access (the existing *_admin policies stay). These add
-- the matchmaker write path, kept as narrow as the feature allows.
-- ---------------------------------------------------------------------------

-- Matchmakers may read all usage for their club (they need the day's totals)…
create policy usage_entries_matchmaker_read on usage_entries for select to authenticated
  using (is_matchmaker (club_id));
create policy usage_items_matchmaker_read on usage_items for select to authenticated
  using (is_matchmaker (club_id));

-- …record usage, stamping themselves as the recorder…
create policy usage_entries_matchmaker_insert on usage_entries for insert to authenticated
  with check (is_matchmaker (club_id) and recorded_by = (select auth.uid()));
create policy usage_items_matchmaker_insert on usage_items for insert to authenticated
  with check (is_matchmaker (club_id));

-- …and correct only what they themselves recorded. The USING clause is what
-- confines them to their own rows; the WITH CHECK stops them reassigning an
-- entry to somebody else on the way out.
create policy usage_entries_matchmaker_update on usage_entries for update to authenticated
  using (is_matchmaker (club_id) and recorded_by = (select auth.uid()))
  with check (is_matchmaker (club_id) and recorded_by = (select auth.uid()));
create policy usage_entries_matchmaker_delete on usage_entries for delete to authenticated
  using (is_matchmaker (club_id) and recorded_by = (select auth.uid()));

create policy usage_items_matchmaker_update on usage_items for update to authenticated
  using (
    is_matchmaker (club_id)
    and exists (
      select 1 from usage_entries e
      where e.id = usage_items.usage_id and e.recorded_by = (select auth.uid())
    )
  )
  with check (is_matchmaker (club_id));
create policy usage_items_matchmaker_delete on usage_items for delete to authenticated
  using (
    is_matchmaker (club_id)
    and exists (
      select 1 from usage_entries e
      where e.id = usage_items.usage_id and e.recorded_by = (select auth.uid())
    )
  );

-- Recording usage draws stock down, so matchmakers need to update holdings.
-- This deliberately is NOT limited to their own holding: the feature lets them
-- say the shuttles came out of another matchmaker's barrels, which is a real
-- situation on a game day. Every such change is written to inventory_log with
-- the actor's name, so a wrong deduction is traceable and correctable rather
-- than prevented outright. Insert/delete stay admin-only — a matchmaker can
-- draw stock down, never create or remove an allocation.
create policy holdings_matchmaker_update on holdings for update to authenticated
  using (is_matchmaker (club_id))
  with check (is_matchmaker (club_id));

-- Matchmakers must be able to append to the audit trail for those deductions.
create policy inventory_log_matchmaker_insert on inventory_log for insert to authenticated
  with check (is_matchmaker (club_id));
create policy inventory_log_matchmaker_read on inventory_log for select to authenticated
  using (is_matchmaker (club_id));
