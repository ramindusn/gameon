-- 20260807040000_drop_legacy_stock_pool.sql — remove the club-wide pool that
-- stock no longer lives in (TASK-83).
--
-- products.barrels / loose_shuttles were THE stock before barrels were handed to
-- individual matchmakers (TASK-69). Since then stock has lived in `holdings`,
-- and productStock() ignored these columns whenever any holding existed. The
-- matchmaker_stock migration said they would go "in a later migration"; this is
-- it, and it is overdue.
--
-- Leaving them cost three separate bugs, all the same shape — a write path and
-- its undo pointing at different stores, so a change landed on a figure nobody
-- could see while the real stock sat untouched:
--   TASK-77  deleting usage credited the pool, so shuttles never came back
--   TASK-81  deleting a game day left its usage behind entirely
--   TASK-82  deleting a purchase debited the pool, so barrels never left
--
-- Each fix redirected one path. The column is the class; this removes it.
--
-- Safe to drop: nothing reads them. productStock() sums holdings, the client no
-- longer selects or writes them, and every figure on screen comes from holdings.
-- Verified before running — prod's columns and holdings agreed exactly (RSL
-- 17b+1l = 205 both ways, Victor 7b+10l = 94 both ways), so nothing is being
-- discarded that the holdings do not already say.

alter table products
  drop column if exists barrels,
  drop column if exists loose_shuttles;
