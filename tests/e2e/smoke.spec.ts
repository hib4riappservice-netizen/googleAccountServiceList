import { test, expect } from '@playwright/test'

// クリティカルパスがまだ無いため、疎通のみを確認する最小限の1本。
// 機能が生まれ次第、TEST-01 (MUST) の「サインアップ→ログイン→主要アクション」に置き換える。
test('トップページが表示される', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('アカウントレーダー')
})
