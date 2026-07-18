import { test, expect } from '@playwright/test'
import { signInAsMatchmaker } from './helpers'

// Live sessions & scoring (E04 / TASK-5.4, E09 / TASK-10.3). The dev server runs
// with VITE_E2E=1, so sign-in uses the auth bypass, the roster resolves to a
// seeded 8-player club, and match-play reads/writes go to an in-memory
// sessionStorage store (see play/e2eStore.ts) — no live Supabase needed. A
// matchmaker turns a generated draw into a session, records point scores (the
// winner is derived), finishes it, and finds it in history.

test.beforeEach(async ({ page }) => {
  await signInAsMatchmaker(page)
})

test('matchmaker starts a session, scores a match, and finds it in history', async ({
  page,
}) => {
  // Generate a one-round draw from the seeded roster (8 players → 2 courts).
  await page.goto('/generate')
  await page.getByTestId('rounds-input').fill('1')
  await page.getByTestId('generate-button').click()
  await expect(page.getByTestId('draw-result')).toBeVisible()

  // Create a game day → routed to the scoring view.
  await page.getByTestId('create-game-day').click()
  await expect(page).toHaveURL(/\/play\/[^/]+$/)
  const sessionUrl = page.url()
  await expect(page.getByTestId('session-status')).toHaveText('Live')
  await expect(page.getByText(/0 \/ 2 recorded/)).toBeVisible()

  // Record point scores on the first court; the winner is derived.
  const court = page.locator('[data-testid^="court-"]').first()
  await court.locator('[data-testid^="score-"][data-testid$="-a"]').fill('21')
  await court.locator('[data-testid^="score-"][data-testid$="-b"]').fill('17')
  await court.locator('[data-testid^="save-score-"]').click()
  await expect(page.getByText(/1 \/ 2 recorded/)).toBeVisible()

  // Finishing is blocked while the second court is still unscored.
  await expect(page.getByTestId('finish-session')).toBeDisabled()
  await expect(page.getByTestId('finish-hint')).toBeVisible()

  // Score the second court too → nothing outstanding.
  const court2 = page.locator('[data-testid^="court-"]').nth(1)
  await court2.locator('[data-testid^="score-"][data-testid$="-a"]').fill('21')
  await court2.locator('[data-testid^="score-"][data-testid$="-b"]').fill('19')
  await court2.locator('[data-testid^="save-score-"]').click()
  await expect(page.getByText(/2 \/ 2 recorded/)).toBeVisible()
  await expect(page.getByTestId('finish-hint')).toHaveCount(0)

  // Finishing succeeds and routes to the leaderboard (the recompute landing).
  await expect(page.getByTestId('finish-session')).toBeEnabled()
  await page.getByTestId('finish-session').click()
  await expect(page).toHaveURL(/\/leaderboard$/)

  // The finished game day persists (sessionStorage) and shows in the
  // matchmaker's game-day history.
  await page.goto('/matchmaker')
  const sessionId = sessionUrl.split('/play/')[1]
  const link = page.getByTestId(`recent-${sessionId}`)
  await expect(link).toBeVisible()

  // Reopening the session from history shows the recorded score + Finished.
  await link.click()
  await expect(page).toHaveURL(new RegExp(`/play/${sessionId}$`))
  await expect(page.getByTestId('session-status')).toHaveText('Finished')
  await expect(page.getByText(/2 \/ 2 recorded/)).toBeVisible()
})

test('matchmaker sets a game-day date, edits it, then deletes the game day', async ({
  page,
}) => {
  await page.goto('/generate')
  await page.getByTestId('rounds-input').fill('1')
  await page.getByTestId('generate-button').click()
  await expect(page.getByTestId('draw-result')).toBeVisible()

  // The game-day date/time defaults to now and is editable before creating.
  const dt = page.getByTestId('game-day-datetime')
  await expect(dt).toBeVisible()
  await dt.fill('2026-05-01T19:30')
  await page.getByTestId('create-game-day').click()
  await expect(page).toHaveURL(/\/play\/[^/]+$/)
  const sessionId = page.url().split('/play/')[1]

  // The chosen date shows on the play view; edit it to a new value.
  await expect(page.getByTestId('game-day-date')).toContainText('2026')
  await page.getByTestId('edit-datetime').click()
  await page.getByTestId('game-day-datetime-input').fill('2026-05-02T20:00')
  await page.getByTestId('save-datetime').click()
  await expect(page.getByTestId('game-day-date')).toBeVisible()

  // Delete the game day (two-step confirm) → back to the matchmaker hub, with
  // the (never-finished) game day gone from the Live now list.
  await page.getByTestId('delete-game-day').click()
  await page.getByTestId('confirm-delete-game-day').click()
  await expect(page).toHaveURL(/\/matchmaker$/)
  await expect(page.getByTestId(`live-${sessionId}`)).toHaveCount(0)
})

test('matchmaker edits a line-up, adds a custom match, scores all, and finishes', async ({
  page,
}) => {
  await page.goto('/generate')
  await page.getByTestId('rounds-input').fill('1')
  await page.getByTestId('generate-button').click()
  await expect(page.getByTestId('draw-result')).toBeVisible()

  // Create the game day with an explicit date/time.
  await page.getByTestId('game-day-datetime').fill('2026-05-10T18:00')
  await page.getByTestId('create-game-day').click()
  await expect(page).toHaveURL(/\/play\/[^/]+$/)
  await expect(page.getByText(/0 \/ 2 recorded/)).toBeVisible()

  // Edit the first court's line-up (full substitution): open the editor and
  // re-pick all four slots from the present roster, then save.
  const firstCourt = page.locator('[data-testid^="court-"]').first()
  await firstCourt.locator('[data-testid^="edit-lineup-"]').click()
  const editor = page.locator('[data-testid^="lineup-editor-"]').first()
  await editor.locator('[data-testid$="-a1"]').selectOption({ index: 1 })
  await editor.locator('[data-testid$="-a2"]').selectOption({ index: 2 })
  await editor.locator('[data-testid$="-b1"]').selectOption({ index: 3 })
  await editor.locator('[data-testid$="-b2"]').selectOption({ index: 4 })
  await editor.locator('[data-testid^="save-lineup-"]').click()
  await expect(page.locator('[data-testid^="lineup-editor-"]')).toHaveCount(0)

  // Add a custom match → it lands in a new round 2 (3 matches total). The
  // add-match picker is scoped to this game day's players (TASK-32), and round 1
  // is full, so target a new round where those players are free again.
  await page.getByTestId('add-custom-match').click()
  await page.getByTestId('custom-round').selectOption('2')
  await page.getByTestId('custom-a1').selectOption({ index: 1 })
  await page.getByTestId('custom-a2').selectOption({ index: 2 })
  await page.getByTestId('custom-b1').selectOption({ index: 3 })
  await page.getByTestId('custom-b2').selectOption({ index: 4 })
  await page.getByTestId('save-custom-match').click()
  await expect(page.getByText(/0 \/ 3 recorded/)).toBeVisible()

  // Rounds are paged: page to round 2 to see the custom court, then delete it
  // (two-step) → back to round 1's 2 courts.
  await page.locator('[aria-label="Next round"]').click()
  await expect(page.getByTestId('round-label')).toContainText('Round 2')
  await expect(page.locator('[data-testid^="court-"]')).toHaveCount(1)
  const customCourt = page.locator('[data-testid^="court-"]').first()
  await customCourt.locator('[data-testid^="delete-match-"]').click()
  await customCourt.locator('[data-testid^="confirm-delete-match-"]').click()
  await expect(page.getByText(/0 \/ 2 recorded/)).toBeVisible()

  // Finishing is blocked until every remaining match is scored.
  await expect(page.getByTestId('finish-session')).toBeDisabled()
  await expect(page.getByTestId('finish-hint')).toBeVisible()

  // Score both courts.
  const courts = page.locator('[data-testid^="court-"]')
  for (let i = 0; i < 2; i++) {
    const c = courts.nth(i)
    await c.locator('[data-testid^="score-"][data-testid$="-a"]').fill('21')
    await c.locator('[data-testid^="score-"][data-testid$="-b"]').fill(String(15 + i))
    await c.locator('[data-testid^="save-score-"]').click()
  }
  await expect(page.getByText(/2 \/ 2 recorded/)).toBeVisible()
  await expect(page.getByTestId('finish-hint')).toHaveCount(0)

  // Now finishing succeeds (which, in production, triggers the ranking
  // recompute) and routes to the leaderboard.
  await expect(page.getByTestId('finish-session')).toBeEnabled()
  await page.getByTestId('finish-session').click()
  await expect(page).toHaveURL(/\/leaderboard$/)
})

test('signed-out visitor gets the public, read-only game-day page (TASK-50)', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => sessionStorage.clear())

  // /play with no id has no route → catch-all bounces to the public home.
  await page.goto('/play')
  await expect(page.getByTestId('nav-admin-login')).toBeVisible()

  // /play/:id is public: the page renders read-only (a bogus id shows the
  // "not found" state, but crucially it is NOT bounced to login).
  await page.goto('/play/some-session-id')
  await expect(page.getByTestId('play')).toBeVisible()
  // No matchmaker editing controls for a signed-out viewer.
  await expect(page.getByTestId('finish-session')).toHaveCount(0)
  await expect(page.getByTestId('add-custom-match')).toHaveCount(0)
})
