import { test, expect } from '@playwright/test'

// 実Gmailデータでのスキャン結果自体はE2Eで自動化しない（実アカウントが必要なため）。
// ここでは未サインイン時にスキャン機能が見えないことだけを検証する。実データでの動作は手動確認。

test('未サインイン時はスキャン開始ボタンが表示されない', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'スキャン開始' })).not.toBeVisible()
})
