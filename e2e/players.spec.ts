import { test, expect } from '@playwright/test'
import { signInAsAdmin } from './helpers'

// Roster permissions (E02 / TASK-3.4). /players is gated to admins + matchmakers.

// Both cases turn on whether ProtectedRoute bounced the visitor home. That used
// to be inferred from the login buttons, which only the public home carried;
// since TASK-76.1 every signed-out page shows them, so these assert the landing
// route itself — which is what was actually meant.
test('signed-out visitor is redirected away from /players', async ({ page }) => {
  await page.goto('/players')
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByTestId('home')).toBeVisible()
  await expect(page.getByTestId('players')).toHaveCount(0)
})

test('a player profile is publicly viewable (no login)', async ({ page }) => {
  await page.goto('/players/00000000-0000-0000-0000-000000000000')
  // Reachable without auth (no redirect home); empty DB -> not found.
  await expect(page.getByTestId('player-profile')).toBeVisible()
  await expect(page).toHaveURL(/\/players\/00000000-0000-0000-0000-000000000000$/)
})

test('admin can open the players page', async ({ page }) => {
  await signInAsAdmin(page)

  await page.goto('/players')
  await expect(page.getByTestId('players')).toBeVisible()
  await expect(page.getByTestId('add-player-button')).toBeVisible()
})
