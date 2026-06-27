---
id: TASK-22
title: Use shared Field component for Generate page inputs
status: Done
assignee: []
created_date: '2026-06-27 22:34'
updated_date: '2026-06-27 22:54'
labels:
  - ui-ux
dependencies: []
priority: low
ordinal: 76000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
GeneratePage re-implements the Rounds and Courts number inputs by hand with duplicated class strings instead of the shared Field component, risking visual drift. Consolidate onto Field (extending Field if needed to support number/inline width). Audit item #7.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Rounds and Courts inputs use the shared Field component (or a shared variant), removing duplicated class strings
- [x] #2 Existing data-testids (rounds-input, courts-input) and clamp-on-blur behaviour are preserved
- [x] #3 GeneratePage tests still pass
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Extended Field to accept a ReactNode label and an inline (w-24) variant, then replaced the two bespoke Rounds/Courts inputs in GeneratePage with <Field inline>. data-testids and clamp-on-blur preserved; GeneratePage tests pass.
<!-- SECTION:FINAL_SUMMARY:END -->
