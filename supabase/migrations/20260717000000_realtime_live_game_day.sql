-- Live game day updates (TASK-52). Publish the game-day tables to the
-- `supabase_realtime` publication so an open Play page refreshes for every
-- viewer the moment a matchmaker saves a score or edits a line-up. Realtime
-- still honours RLS: only rows a client can SELECT are broadcast, and these
-- tables are public-read, so players receive the same changes.
--
-- Idempotent: skip a table if it is already in the publication (re-running is
-- safe across environments).
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'match_results'
  ) then
    alter publication supabase_realtime add table public.match_results;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'match_sessions'
  ) then
    alter publication supabase_realtime add table public.match_sessions;
  end if;
end $$;
