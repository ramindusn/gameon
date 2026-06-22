-- 20260622113527_transaction_logged_by.sql — record who logged each transaction.
-- Nullable text (the signed-in admin's identity at creation time); existing rows
-- stay null and render as "—" in the Transaction Log.

alter table contributions add column if not exists logged_by text;
alter table purchases     add column if not exists logged_by text;
alter table expenses      add column if not exists logged_by text;
alter table usage_entries add column if not exists logged_by text;
