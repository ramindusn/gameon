-- 20260622130521_skill_range_1_to_10.sql — widen player skill from 1–5 to 1–10.
alter table player_profiles drop constraint if exists player_profiles_skill_check;
alter table player_profiles add constraint player_profiles_skill_check check (skill between 1 and 10);
