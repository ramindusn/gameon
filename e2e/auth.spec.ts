import { test, expect } from '@playwright/test'

// The dev server runs with VITE_E2E=1 (playwright.config), so sign-in uses the
// bypass: the forms drive the real UI but resolve the role without Supabase.
// Login opens from the Home top-bar buttons (the separate /login page was removed).

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  // Start each test signed out.
  await page.evaluate(() => sessionStorage.clear())
  await page.reload()
  await expect(page.getByTestId('nav-admin-login')).toBeVisible()
})

test('admin signs in via the magic-link form', async ({ page }) => {
  await page.getByTestId('nav-admin-login').click()
  await page.getByTestId('admin-email').fill('admin@badmintonduo.club')
  await page.getByTestId('admin-magic-link-submit').click()

  await expect(page.getByTestId('auth-role')).toHaveText('Role: admin')
  await expect(page.getByTestId('sign-out')).toBeVisible()
})

test('matchmaker signs in with username + password', async ({ page }) => {
  await page.getByTestId('nav-matchmaker-login').click()
  await page.getByTestId('mm-username').fill('rohan')
  await page.getByTestId('mm-password').fill('secret')
  await page.getByTestId('mm-login-submit').click()

  await expect(page.getByTestId('auth-role')).toHaveText('Role: matchmaker')
})

test('sign out returns to the public home', async ({ page }) => {
  await page.getByTestId('nav-admin-login').click()
  await page.getByTestId('admin-email').fill('admin@badmintonduo.club')
  await page.getByTestId('admin-magic-link-submit').click()
  await expect(page.getByTestId('sign-out')).toBeVisible()

  await page.getByTestId('sign-out').click()
  await expect(page.getByTestId('nav-admin-login')).toBeVisible()
})
