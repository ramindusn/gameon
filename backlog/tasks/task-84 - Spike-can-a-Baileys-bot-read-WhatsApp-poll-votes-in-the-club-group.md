---
id: TASK-84
title: 'Spike: can a Baileys bot read WhatsApp poll votes in the club group?'
status: To Do
assignee: []
created_date: '2026-08-08 06:25'
updated_date: '2026-08-08 06:28'
labels: []
dependencies: []
priority: high
ordinal: 150000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Find out whether an unofficial WhatsApp bot can actually collect availability votes from a poll in the real club group, before committing to build anything on it.

Everything else in the WhatsApp availability idea is ordinary work. This one unknown decides whether the bot route exists at all: poll vote decryption is the flakiest surface in Baileys and has broken repeatedly when WhatsApp changed identifiers (issues 1678, 2158, 2342 - it was commented out of the library entirely at one point because of the LID rollout). If votes do not decrypt in OUR group with OUR members' privacy settings, the bot route is dead and the paste importer is the answer.

Throwaway by design. Runs against dev only, writes nothing to Supabase, and lives outside the app until it proves itself.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A spare number is linked as a Baileys device and stays connected across a restart without re-scanning
- [ ] #2 The bot posts a poll into a test group and it appears as a native WhatsApp poll
- [ ] #3 Votes cast by two or more different people are decrypted and reported, or the failure is captured with the exact error
- [ ] #4 The report says whether voters come back as phone numbers or opaque LID identifiers, since that decides whether votes can be matched to players
- [ ] #5 Result recorded on the task: bot route viable or not, with evidence
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Finding before the spike even runs

Baileys does NOT decrypt poll votes for you, in either current line.

In both 6.7.24 (legacy tag) and 7.0.0-rc14 (latest tag), the poll-vote block in
lib/Utils/process-message.js is commented out and marked "TODO: Remove entirely".
So the socket never emits messages.update with pollUpdates, and every tutorial
built on that event describes behaviour that no longer ships. Verified by reading
the installed package source, not the docs.

decryptPollVote() is still exported and the raw pollUpdateMessage still arrives on
messages.upsert, so the decryption has to be done by us.

## What the spike therefore tests

The known breakage (Baileys #1678, #2158, #2342) is which identifier the vote key
is derived from. The key comes from poll id + creator jid + voter jid + salt, and
since the LID rollout either side may be addressed as @lid or @s.whatsapp.net.
The spike tries every combination and reports which one decrypts, rather than
guessing. It also reports whether a LID voter resolves back to a phone number,
because that decides whether a vote can be matched to a club member at all.

## Second question the spike answers

Only polls the bot itself posts can ever be read: decryption needs the poll's
messageSecret, which we only hold for our own messages. A poll a human posts in
the group is unreadable. So the bot must be the one that posts it.

## Where it lives

Scratchpad only (wa-spike/), throwaway, no Supabase, nothing in the repo.
Credentials in ./auth must never be committed.
<!-- SECTION:NOTES:END -->
