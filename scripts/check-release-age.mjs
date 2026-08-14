#!/usr/bin/env node
// rules/20-security.md SEC-11 を機械判定する。
// 「設定したつもり」ではなく、pnpm が実際に解決した値を確認する。
// キー名を間違えると未知の設定として黙って無視されるため、
// 「設定が存在すること」と「値が3日以上であること」の両方を検証する。
import { execSync } from 'node:child_process'

const MIN_MINUTES = 3 * 24 * 60 // 3日

let output
try {
  output = execSync('pnpm config list --json', { encoding: 'utf8' })
} catch (err) {
  console.error('❌ pnpm config list の実行に失敗しました:', err.message)
  process.exit(1)
}

let config
try {
  config = JSON.parse(output)
} catch {
  console.error('❌ pnpm config list --json の出力をパースできませんでした')
  console.error(output)
  process.exit(1)
}

const value = config.minimumReleaseAge

if (value === undefined || value === null) {
  console.error(
    '❌ [SEC-11] minimumReleaseAge が設定されていません（未知のキー名で無視されている可能性あり）',
  )
  console.error(
    '   pnpm-workspace.yaml に minimumReleaseAge: 4320 (分単位, 3日) を設定してください',
  )
  process.exit(1)
}

if (typeof value !== 'number' || value < MIN_MINUTES) {
  console.error(`❌ [SEC-11] minimumReleaseAge = ${value} 分。3日 (${MIN_MINUTES}分) 未満です`)
  process.exit(1)
}

console.log(
  `✅ [SEC-11] minimumReleaseAge = ${value} 分（${(value / 60 / 24).toFixed(1)}日）。3日以上を満たしています`,
)
