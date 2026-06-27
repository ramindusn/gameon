import { test, expect } from '@playwright/test'
import { signInAsMatchmaker } from './helpers'

// Match generator (E03 / TASK-4.3). The dev server runs with VITE_E2E=1, so
// sign-in uses the auth bypass and the roster resolves to a seeded 8-player club
// (see roster/api.ts) — no live Supabase needed. A matchmaker picks present
// players, chooses rounds, and gets a balanced draw (courts + sitting).

test.beforeEach(async ({ page }) => {
  // Only matchmakers reach /generate.
  await signInAsMatchmaker(page)
})

test('signed-out visitor cannot reach /generate', async ({ page }) => {
  await page.evaluate(() => sessionStorage.clear())
  await page.goto('/generate')
  // ProtectedRoute bounces to the public home (which hosts the login dropdowns).
  await expect(page.getByTestId('nav-admin-login')).toBeVisible()
  await expect(page.getByTestId('generate')).toHaveCount(0)
})

test('matchmaker generates a draw from the seeded roster', async ({ page }) => {
  await page.goto('/generate')
  await expect(page.getByTestId('generate')).toBeVisible()
  // Seeded roster = 8 players, all selected by default.
  await expect(page.getByText('Selected: 8 / 8')).toBeVisible()

  await page.getByTestId('rounds-input').fill('3')
  await page.getByTestId('generate-button').click()

  // The draw renders: rounds with courts, and player names from the roster.
  await expect(page.getByTestId('draw-result')).toBeVisible()
  await expect(page.getByText('Round 1')).toBeVisible()
  // 8 players → 2 courts per round.
  await expect(page.getByText(/Court \d/).first()).toBeVisible()
  await expect(page.getByText('E2E Player 1').first()).toBeVisible()
})
