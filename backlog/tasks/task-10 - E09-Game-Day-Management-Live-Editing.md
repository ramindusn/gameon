---
id: TASK-10
title: E09 - Game Day Management & Live Editing
status: To Do
assignee: []
created_date: '2026-06-22 20:38'
labels:
  - E09
dependencies: []
ordinal: 53000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Turn the live 'session' into a managed 'game day'. The matchmaker generates a draw, reviews it, then explicitly creates a game day (with an editable date/time) that persists to the backend. During play the matchmaker can edit match line-ups (full substitution from the present roster), add custom/ad-hoc matches when the draw runs low, delete matches that won't be played, and enter point scores per match (winner derived from the scores). A game day can only be finished once every match is resolved (scored or deleted); only finished game days feed the ranking. The matchmaker can also edit a game day's date/time or delete a game day if something is wrong. Builds on E04 (Live Sessions & Scoring) and E05 (Ranking).
<!-- SECTION:DESCRIPTION:END -->
