import { test, expect } from '@playwright/test'

test('OAuth拒否時のエラーページが内容を出し分ける', async ({ page }) => {
  await page.goto('/auth/error?error=AccessDenied')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'サインインが許可されませんでした',
  )
})
