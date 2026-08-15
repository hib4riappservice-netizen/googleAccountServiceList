import { test, expect } from '@playwright/test'

// 実際のGoogleアカウントでの同意完了までは自動化しない（CIに認証情報を置かない・
// Googleの自動化ログインは現実的に不安定なため）。ここでは自分のアプリ側の配線
// （ボタン表示・Google認可エンドポイントへの遷移）だけを検証する。
// 実アカウントでの通し確認は、Google Cloud側のテストユーザー登録後に手動で行う。

test('未サインイン時、Googleでサインインボタンが表示される', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Googleでサインイン' })).toBeVisible()
})

test('サインインボタンを押すとGoogleの認可エンドポイントへ遷移しようとする', async ({ page }) => {
  // TEST-03 (MUST): 外部API（Google）への実際のライブ通信はしない。
  // accounts.google.com 宛のリクエストを横取りし、遷移先URLの構築だけを検証する。
  let requestedUrl: string | null = null
  await page.route('https://accounts.google.com/**', async (route) => {
    requestedUrl = route.request().url()
    await route.fulfill({ status: 200, contentType: 'text/plain', body: 'ok' })
  })

  await page.goto('/')
  await Promise.all([
    page.waitForURL(/^https:\/\/accounts\.google\.com\//),
    page.getByRole('button', { name: 'Googleでサインイン' }).click(),
  ])

  expect(requestedUrl).toContain('client_id=')
})
