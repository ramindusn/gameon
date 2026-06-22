import { test, expect } from '@playwright/test'

// Live sessions & scoring (E04 / TASK-5.4). The dev server runs with VITE_E2E=1,
// so sign-in uses the auth bypass, the roster resolves to a seeded 8-player club,
// and match-play reads/writes go to an in-memory sessionStorage store (see
// play/e2eStore.ts) — no live Supabase needed. A matchmaker turns a generated
// draw into a session, records a winner, finishes it, and finds it in history.

test.beforeEach(async ({ page }) => {
  await page.goto('/login')
  await page.evaluate(() => sessionStorage.clear())
  await page.reload()
  await page.getByTestId('tab-matchmaker').click()
  await page.getByTestId('mm-username').fill('rohan')
  await page.getByTestId('mm-password').fill('secret')
  await page.getByTestId('mm-login-submit').click()
  await expect(page.getByTestId('auth-role')).toHaveText('Role: matchmaker')
})

test('matchmaker starts a session, records a winner, and finds it in history', async ({
  page,
}) => {
  // Generate a one-round draw from the seeded roster (8 players → 2 courts).
  await page.goto('/generate')
  await page.getByTestId('rounds-input').fill('1')
  await page.getByTestId('generate-button').click()
  await expect(page.getByTestId('draw-result')).toBeVisible()

  // Start a live session → routed to the scoring view.
  await page.getByTestId('start-session').click()
  await expect(page).toHaveURL(/\/play\/[^/]+$/)
  const sessionUrl = page.url()
  await expect(page.getByTestId('session-status')).toHaveText('Live')
  await expect(page.getByText(/0 \/ 2 recorded/)).toBeVisible()

  // Record a winner on the first court (team A).
  await page.locator('[data-testid^="pick-"][data-testid$="-a"]').first().click()
  await expect(page.getByText(/1 \/ 2 recorded/)).toBeVisible()

  // Finish the session.
  await page.getByTestId('finish-session').click()
  await expect(page.getByTestId('session-status')).toHaveText('Finished')

  // The session persists (sessionStorage) and shows in history as Finished.
  await page.goto('/play')
  await expect(page.getByTestId('sessions')).toBeVisible()
  const sessionId = sessionUrl.split('/play/')[1]
  const link = page.getByTestId(`session-${sessionId}`)
  await expect(link).toBeVisible()
  await expect(link).toContainText('Finished')

  // Reopening the session from history shows the recorded winner.
  await link.click()
  await expect(page).toHaveURL(new RegExp(`/play/${sessionId}$`))
  await expect(page.getByText(/1 \/ 2 recorded/)).toBeVisible()
})

test('signed-out visitor cannot reach /play or a session', async ({ page }) => {
  await page.evaluate(() => sessionStorage.clear())

  await page.goto('/play')
  // ProtectedRoute bounces to the login chooser.
  await expect(page.getByTestId('tab-admin')).toBeVisible()
  await expect(page.getByTestId('sessions')).toHaveCount(0)

  await page.goto('/play/some-session-id')
  await expect(page.getByTestId('tab-admin')).toBeVisible()
  await expect(page.getByTestId('play')).toHaveCount(0)
})
