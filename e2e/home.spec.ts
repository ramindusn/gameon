import { test, expect } from '@playwright/test'

// Public home (TASK-9.1): hero + the two login buttons in the top bar.

test('home shows hero and both login buttons', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByTestId('home')).toBeVisible()
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Elevate Your')
  await expect(page.getByTestId('nav-admin-login')).toBeVisible()
  await expect(page.getByTestId('nav-matchmaker-login')).toBeVisible()
})

test('Admin Login button opens the admin sign-in', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('nav-admin-login').click()
  await expect(page.getByTestId('admin-email')).toBeVisible()
})

test('Matchmaker Login button opens the matchmaker sign-in', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('nav-matchmaker-login').click()
  await expect(page.getByTestId('mm-username')).toBeVisible()
})
