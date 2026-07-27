---
id: TASK-61
title: 'Extend metric colour language: blue frame on game-day containers'
status: Done
assignee: []
created_date: '2026-07-27 20:29'
updated_date: '2026-07-27 20:31'
labels:
  - ui
  - ranking
  - polish
dependencies: []
ordinal: 114000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Follow-up to TASK-60. The metric colour language (blue=game-day points, green=ranking) currently applies only to numbers. Extend it to the Home Game Day Podium card container so the whole card reads as game-day content: its border, hover/focus ring, subtle background tint, the #1 winner podium pedestal highlight, and the 'View game day scores' link all switch from brand green to game-day blue (sky). Ranking cards keep green/neutral. Add reusable blue frame constants to metricColors.ts (mirroring POINTS_TEXT) so it stays centralised.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Home Game Day Podium card border + focus ring + subtle bg tint are blue (sky), not green
- [x] #2 The #1 podium pedestal highlight is blue; 2nd/3rd pedestals unchanged (neutral)
- [x] #3 'View game day scores' link is blue (POINTS_TEXT)
- [x] #4 Ranking preview cards and all other brand-accent green UI are unchanged
- [x] #5 Blue frame values live as reusable constants in metricColors.ts
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Added POINTS_FRAME (border-sky-400/40 bg-sky-400/5), POINTS_FRAME_HOVER, POINTS_RING, and POINTS_HILITE (border-sky-400 bg-sky-400/15) to metricColors.ts. Applied in Home.tsx GameDayRank: the card <Link> frame (border+tint+hover+focus ring), the #1 podium pedestal (PodiumSpot place===1, Home-only component), and the 'View game day scores' link (POINTS_TEXT). 2nd/3rd pedestals and all ranking/brand-accent UI unchanged. Verified on localhost (dev DB): whole podium card reads blue, ranking cards stay neutral/green, no console errors. Committed on feature/metric-colour-consistency alongside TASK-60 (same theme, same file). Full suite passes bar the pre-existing PlayerProfilePage timezone failure. Note (not done, optional): the section-header trophy icon + date pager arrows are still brand-green — they're section chrome outside the card border, left as-is per the chosen card-scoped option.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Extended the blue/green metric language from numbers to containers: the Home Game Day Podium card now has a blue frame, blue #1 pedestal highlight, and blue link, so the whole card reads as game-day content. Reusable blue frame constants added to metricColors.ts. Ranking cards and brand-accent green left unchanged.
<!-- SECTION:FINAL_SUMMARY:END -->
