# How GameOn Ranking Works

A plain-language guide to the leaderboard — what the numbers mean and why it's
fair. For the formal design and formulas, see
[ADR 0011](adr/0011-ranking-glicko2.md).

GameOn uses **Glicko-2**, a modern rating system (the successor to Elo, used in
chess and many online games). Instead of just a single "score," it tracks how
good you are **and** how confident the system is about that estimate.

## The numbers behind every player

| Keyword | Full form | What it means |
| --- | --- | --- |
| **Rating** | Rating | Your skill estimate. Everyone starts at **1500**. Goes up when you win, down when you lose. |
| **RD** | **R**ating **D**eviation | The system's *uncertainty* about your rating. New players start at **350** (very unsure); it shrinks as you play and slowly grows again while you're idle. |
| **Vol** | **Vol**atility | How erratic your results are. Steady players have low volatility; streaky/inconsistent players have higher. |
| **PROV** | **Prov**isional | A badge shown while your **RD is above 150** — you haven't played enough for the rank to be trusted yet. It disappears once the system is confident. |

## The key ideas (what makes it fair)

1. **Margin matters.** You don't just get credit for winning — your score is
   your **point share** (`your points ÷ total points`). Winning 21–5 moves you
   more than winning 21–19.

2. **Beating strong players is worth more.** Because rating and RD feed the
   math, an upset against a high-rated opponent moves you more than beating a
   weaker one.

3. **Order within a game day doesn't matter.** Every match in one locked game
   day is scored against everyone's rating *as it stood at the start of that
   day*, so the sequence of matches can't bias the result.

4. **Two leaderboards:**
   - **Individual** — you face a "synthetic opponent" equal to the average of
     the two people across the net.
   - **Pairs** — a partnership (A + B) is rated as one unit, regardless of which
     name is listed first.

5. **Idle players aren't punished hard.** Skip a game day and your rating barely
   changes — but your RD grows (the system becomes less sure). Long absence
   gently pulls an above-average rating back toward 1500 (about **20** points per
   missed day), but **never below** the 1500 starting line.

## One-line version

> Your rating is your skill (starts at 1500), RD is how confident we are in it,
> and PROV just means "not enough games yet." You're rewarded more for winning
> big and for beating strong players — and the order of games in a day never
> matters.

## Default values at a glance

| Setting | Value | Meaning |
| --- | --- | --- |
| Starting rating | 1500 | Where every new player begins |
| Starting RD | 350 | Maximum uncertainty for an unrated player |
| Provisional threshold | RD > 150 | Above this, the **PROV** badge shows |
| Absence decay | ~20 / missed day | Pull toward baseline while away |
| Absence floor | 1500 | Decay never drops you below the start |
