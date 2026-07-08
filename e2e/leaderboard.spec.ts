import { test, expect } from '@playwright/test'

// Public leaderboard (E05 / TASK-6.4). In E2E builds (VITE_E2E=1) the ranking
// boards resolve to a deterministic seed and the roster to the 8-player e2e
// club, so the public Home preview and the /leaderboard page render real rows
// without a live database — no sign-in required.

test('home shows the ranking previews with rows', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByTestId('home')).toBeVisible()
  // Seeded top player e2e-1 appears in the individual ranking table; the top
  // seeded partnership (e2e-1 & e2e-2) appears in the doubles ranking table.
  await expect(page.getByTestId('individual-ranking')).toContainText('E2E Player 1')
  await expect(page.getByTestId('doubles-ranking')).toContainText('E2E Player 2')
})

test('View all opens the full leaderboard with both boards', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('view-all-leaderboard').first().click()
  await expect(page).toHaveURL(/\/leaderboard$/)
  await expect(page.getByTestId('leaderboard')).toBeVisible()
  await expect(page.getByTestId('player-board')).toBeVisible()
  await expect(page.getByTestId('pair-board')).toBeVisible()
  // A seeded partnership row renders both partners' names.
  await expect(page.getByTestId('pair-row-e2e-1-e2e-2')).toContainText('E2E Player 2')
  // A seeded absentee (e2e-8) carries the inactive tag; an active player doesn't.
  await expect(
    page.getByTestId('player-row-e2e-8').getByTestId('inactive-tag'),
  ).toBeVisible()
  await expect(
    page.getByTestId('player-row-e2e-1').getByTestId('inactive-tag'),
  ).toHaveCount(0)
})

test('Leaderboards nav link routes to the leaderboard', async ({ page }) => {
  // The top nav is desktop-only (hidden below md), so widen the viewport.
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/')
  await page.getByRole('link', { name: 'Leaderboards' }).click()
  await expect(page).toHaveURL(/\/leaderboard$/)
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Leaderboards')
})
