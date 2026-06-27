import { type Page, expect } from '@playwright/test'

// The dev server runs with VITE_E2E=1 (see playwright.config), so sign-in uses
// the bypass: the real forms drive the UI but resolve the role without Supabase.
// Login opens from the Home top-bar buttons — the separate /login page was
// removed (commit 61549d2), so every flow starts from '/'.

/** Land on the public home, signed out and reloaded. */
export async function startSignedOut(page: Page) {
  await page.goto('/')
  await page.evaluate(() => sessionStorage.clear())
  await page.reload()
}

/** Sign in as a matchmaker via the Home login dropdown. */
export async function signInAsMatchmaker(page: Page) {
  await startSignedOut(page)
  await page.getByTestId('nav-matchmaker-login').click()
  await page.getByTestId('mm-username').fill('rohan')
  await page.getByTestId('mm-password').fill('secret')
  await page.getByTestId('mm-login-submit').click()
  await expect(page.getByTestId('auth-role')).toHaveText('Role: matchmaker')
}

/** Sign in as an admin via the Home login dropdown (magic-link bypass). */
export async function signInAsAdmin(page: Page) {
  await startSignedOut(page)
  await page.getByTestId('nav-admin-login').click()
  await page.getByTestId('admin-email').fill('admin@badmintonduo.club')
  await page.getByTestId('admin-magic-link-submit').click()
  await expect(page.getByTestId('auth-role')).toHaveText('Role: admin')
}
