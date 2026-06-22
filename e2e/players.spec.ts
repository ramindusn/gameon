import { test, expect } from '@playwright/test'

// Roster permissions (E02 / TASK-3.4). /players is gated to admins + matchmakers.

test('signed-out visitor is redirected away from /players', async ({ page }) => {
  await page.goto('/players')
  // ProtectedRoute bounces to the login chooser.
  await expect(page.getByTestId('tab-admin')).toBeVisible()
  await expect(page.getByTestId('players')).toHaveCount(0)
})

test('a player profile is publicly viewable (no login)', async ({ page }) => {
  await page.goto('/players/00000000-0000-0000-0000-000000000000')
  // Reachable without auth (no redirect to /login); empty DB -> not found.
  await expect(page.getByTestId('player-profile')).toBeVisible()
  await expect(page.getByTestId('tab-admin')).toHaveCount(0)
})

test('admin can open the players page', async ({ page }) => {
  await page.goto('/login')
  await page.evaluate(() => sessionStorage.clear())
  await page.reload()
  await page.getByTestId('admin-email').fill('admin@badmintonduo.club')
  await page.getByTestId('admin-magic-link-submit').click()
  await expect(page.getByTestId('auth-role')).toHaveText('Role: admin')

  await page.goto('/players')
  await expect(page.getByTestId('players')).toBeVisible()
  await expect(page.getByTestId('add-player-button')).toBeVisible()
})
