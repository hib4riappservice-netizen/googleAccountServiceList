import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

// checklists/feature.md「UIを変更した場合」のうち、axe-core で機械判定できる項目
// （コントラスト比 4.5:1、タップ対象 24x24px、label紐づけ、alt等）を1本で検査する。
// UI変更のたびに個別のE2Eを増やすのではなく、対象ページを追加していく運用にする。

test('トップページに axe-core の重大な違反がない', async ({ page }) => {
  await page.goto('/')
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
    .analyze()

  expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([])
})

test('375px幅で横スクロールが発生しない', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 })
  await page.goto('/')

  // globals.css が html/body に overflow-x: hidden を設定しているため、
  // documentElement.scrollWidth による判定は要素のはみ出しを隠してしまい機能しない
  // （実測で確認済み: 2000px要素があっても scrollWidth は溢れを示さなかった）。
  // 各要素の実際の右端座標を見て、ビューポート幅を超えていないか直接検査する。
  const overflowingElements = await page.evaluate(() => {
    const viewportWidth = document.documentElement.clientWidth
    const overflowing: string[] = []
    document.querySelectorAll('body *').forEach((el) => {
      const rect = el.getBoundingClientRect()
      if (rect.width > 0 && rect.right > viewportWidth + 1) {
        overflowing.push(
          `${el.tagName}${el.className ? '.' + el.className : ''} right=${rect.right}`,
        )
      }
    })
    return overflowing
  })

  expect(overflowingElements).toEqual([])
})
