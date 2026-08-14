#!/usr/bin/env node
// rules/01-definition-of-done.md G0 MUST / checklists/feature.md
// 「生成コードと lockfile を除く差分が400行以内」を機械判定する。
// 使い方: node scripts/check-diff-size.mjs [BASE_REF]  (既定 origin/main)
import { execFileSync } from 'node:child_process'
import { parseShortstat } from '../lib/parse-shortstat.ts'

const MAX_LINES = 400
const baseRef = process.argv[2] ?? process.env.DIFF_BASE_REF ?? 'origin/main'

// 生成物・lockfileは対象外（DoD G0の定義どおり）。
// execFileSync に配列で渡す（シェルを経由しない）。`:(exclude)` を含む
// pathspec をシェル文字列に混ぜると、Linuxの/bin/shが `(` を構文エラーとして
// 扱う（CI実行で実測発見。execSync+文字列連結が原因だった）。
const EXCLUDE_PATTERNS = [
  ':(exclude)pnpm-lock.yaml',
  ':(exclude)package-lock.json',
  ':(exclude)yarn.lock',
  ':(exclude).next/**',
  ':(exclude)next-env.d.ts',
  ':(exclude)playwright-report/**',
  ':(exclude)test-results/**',
]

function git(args) {
  return execFileSync('git', args, { encoding: 'utf8' }).trim()
}

try {
  const mergeBase = git(['merge-base', baseRef, 'HEAD'])
  const statOutput = git([
    'diff',
    '--shortstat',
    `${mergeBase}...HEAD`,
    '--',
    '.',
    ...EXCLUDE_PATTERNS,
  ])

  if (!statOutput) {
    console.log('✅ 差分なし')
    process.exit(0)
  }

  const { insertions, deletions } = parseShortstat(statOutput)
  const total = insertions + deletions

  console.log(`差分: +${insertions} -${deletions}（生成コード/lockfileを除く）`)

  if (total > MAX_LINES) {
    console.error(
      `❌ 差分が${MAX_LINES}行を超えています（${total}行）。G0に戻って分割してください（例外なし）`,
    )
    process.exit(1)
  }

  console.log(`✅ 差分は${MAX_LINES}行以内です（${total}行）`)
} catch (err) {
  console.error('❌ check-diff-size.mjs 実行エラー:', err.message)
  console.error(`比較対象のref "${baseRef}" が見つからない可能性があります`)
  process.exit(1)
}
