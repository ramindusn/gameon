import { test, expect } from '@playwright/test'
import { signInAsAdmin } from './helpers'

// Roster permissions (E02 / TASK-3.4). /players is gated to admins + matchmakers.

test('signed-out visitor is redirected away from /players', async ({ page }) => {
  await page.goto('/players')
  // ProtectedRoute bounces to the public home (which hosts the login dropdowns).
  await expect(page.getByTestId('nav-admin-login')).toBeVisible()
  await expect(page.getByTestId('players')).toHaveCount(0)
})

test('a player profile is publicly viewable (no login)', async ({ page }) => {
  await page.goto('/players/00000000-0000-0000-0000-000000000000')
  // Reachable without auth (no redirect home); empty DB -> not found.
  await expect(page.getByTestId('player-profile')).toBeVisible()
  await expect(page.getByTestId('nav-admin-login')).toHaveCount(0)
})

test('admin can open the players page', async ({ page }) => {
  await signInAsAdmin(page)

  await page.goto('/players')
  await expect(page.getByTestId('players')).toBeVisible()
  await expect(page.getByTestId('add-player-button')).toBeVisible()
})
