-- 20260622114725_backfill_logged_by.sql — attribute the demo snapshot's existing
-- transactions to the admin who set them up (Ramindu), so "Logged by" isn't blank.

update contributions set logged_by = 'Ramindu' where logged_by is null;
update purchases     set logged_by = 'Ramindu' where logged_by is null;
update expenses      set logged_by = 'Ramindu' where logged_by is null;
update usage_entries set logged_by = 'Ramindu' where logged_by is null;
