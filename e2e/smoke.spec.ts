import { test, expect } from '@playwright/test'

test('app shell renders', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByTestId('app-root')).toBeVisible()
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
})

test('VITE_E2E flag reaches the app build', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByTestId('app-root')).toHaveAttribute('data-e2e', '1')
})
