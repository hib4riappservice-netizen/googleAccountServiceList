import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { signInAsTestUser } from './helpers/session'

// 実Gmailデータでのスキャン結果自体はE2Eで自動化しない（実アカウントが必要なため）。
// ここでは未サインイン時にスキャン機能が見えないこと、およびサインイン時のみ表示される
// ScanServicesPanel自体のアクセシビリティを検証する。実データでの動作は手動確認。

test('未サインイン時はスキャン開始ボタンが表示されない', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'スキャン開始' })).not.toBeVisible()
})

test('サインイン時、ScanServicesPanelにaxe-coreの重大な違反がない', async ({ page, context }) => {
  await signInAsTestUser(context)
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'スキャン開始' })).toBeVisible()

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
    .analyze()
  expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([])
})
