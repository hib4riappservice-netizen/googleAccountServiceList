#!/usr/bin/env node
// checklists/release.md SEC-99（.gitignore） / SEC-16（Actions SHAピン留め・permissions最小化）
// を機械判定する。
//
// これらは以前 [自動] タグが付いていたが、判定する機械が実在しなかった
// （別セッションの監査 loop-auditor-2 指摘B-1で発覚）。このスクリプトで実装する。
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const results = []
const check = (id, label, pass, detail) => results.push({ id, label, pass, detail })

// SEC-99: .gitignore が .env* を除外している（.env.example は明示的に許可されていてよい）
try {
  const gitignore = readFileSync('.gitignore', 'utf8')
  const hasEnvPattern = /^\.env(\*|\.\*)?$/m.test(gitignore) || /^\.env$/m.test(gitignore)
  check(
    'SEC-99',
    '.gitignore が .env* を除外している',
    hasEnvPattern,
    gitignore.match(/^\.env.*/gm)?.join(', '),
  )
} catch {
  check('SEC-99', '.gitignore が .env* を除外している', false, '.gitignore が見つからない')
}

// SEC-16: GitHub Actions がコミットSHAでピン留めされている
const workflowDir = '.github/workflows'
let workflowFiles = []
try {
  workflowFiles = readdirSync(workflowDir).filter((f) => f.endsWith('.yml') || f.endsWith('.yaml'))
} catch {
  workflowFiles = []
}

if (workflowFiles.length === 0) {
  check('SEC-16', 'ワークフローファイルが存在する', false, `${workflowDir} が空、または存在しない`)
} else {
  for (const file of workflowFiles) {
    const content = readFileSync(join(workflowDir, file), 'utf8')
    const usesLines = [...content.matchAll(/^\s*-?\s*uses:\s*(\S+)/gm)].map((m) => m[1])
    const unpinned = usesLines.filter((u) => !/@[0-9a-f]{40}(\s|$)/.test(u))

    check(
      'SEC-16 SHA',
      `${file}: すべての uses: がコミットSHAでピン留めされている`,
      unpinned.length === 0,
      unpinned.length > 0
        ? `未ピン留め: ${unpinned.join(', ')}`
        : `${usesLines.length}件すべてピン留め済み`,
    )

    // SEC-16 permissions: トップレベルに permissions ブロックがあり、
    // contents: write のような広い権限を既定で持っていない
    const hasPermissions = /^permissions:/m.test(content)
    const hasWriteAll =
      /permissions:\s*write-all/.test(content) || /contents:\s*write/.test(content)
    check(
      'SEC-16 permissions',
      `${file}: permissions が最小化されている`,
      hasPermissions && !hasWriteAll,
      hasPermissions
        ? hasWriteAll
          ? '広い権限(write系)を検出'
          : 'permissionsブロックあり、write系なし'
        : 'permissionsブロックが無い',
    )
  }
}

const fail = results.filter((r) => r.pass === false)
for (const r of results) {
  console.log(`${r.pass ? '✅' : '❌'} [${r.id}] ${r.label}`)
  if (!r.pass) console.log(`   detail: ${r.detail}`)
}
console.log(`\n合格 ${results.filter((r) => r.pass).length} / 不合格 ${fail.length}`)

if (fail.length > 0) process.exit(1)
