import { test, expect } from '@playwright/test'

// Match generator (E03 / TASK-4.3). The dev server runs with VITE_E2E=1, so
// sign-in uses the auth bypass and the roster resolves to a seeded 8-player club
// (see roster/api.ts) — no live Supabase needed. A matchmaker picks present
// players, chooses rounds, and gets a balanced draw (courts + sitting).

test.beforeEach(async ({ page }) => {
  await page.goto('/login')
  await page.evaluate(() => sessionStorage.clear())
  await page.reload()
  // Sign in as a matchmaker (only matchmakers reach /generate).
  await page.getByTestId('tab-matchmaker').click()
  await page.getByTestId('mm-username').fill('rohan')
  await page.getByTestId('mm-password').fill('secret')
  await page.getByTestId('mm-login-submit').click()
  await expect(page.getByTestId('auth-role')).toHaveText('Role: matchmaker')
})

test('signed-out visitor cannot reach /generate', async ({ page }) => {
  await page.evaluate(() => sessionStorage.clear())
  await page.goto('/generate')
  // ProtectedRoute bounces to the login chooser.
  await expect(page.getByTestId('tab-admin')).toBeVisible()
  await expect(page.getByTestId('generate')).toHaveCount(0)
})

test('matchmaker generates a draw from the seeded roster', async ({ page }) => {
  await page.goto('/generate')
  await expect(page.getByTestId('generate')).toBeVisible()
  // Seeded roster = 8 players, all present by default.
  await expect(page.getByText('Present: 8 / 8')).toBeVisible()

  await page.getByTestId('rounds-input').fill('3')
  await page.getByTestId('generate-button').click()

  // The draw renders: rounds with courts, and player names from the roster.
  await expect(page.getByTestId('draw-result')).toBeVisible()
  await expect(page.getByText('Round 1')).toBeVisible()
  // 8 players → 2 courts per round.
  await expect(page.getByText(/Court \d/).first()).toBeVisible()
  await expect(page.getByText('E2E Player 1').first()).toBeVisible()
})
