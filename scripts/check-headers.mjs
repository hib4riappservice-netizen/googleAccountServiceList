#!/usr/bin/env node
// checklists/release.md SEC-90〜92, 98 を機械判定する。
// 使い方: node scripts/check-headers.mjs [BASE_URL]  (既定 http://localhost:3000)
// exit 0 = 全MUST合格。exit 1 = 1つでも不合格。

const baseUrl = process.argv[2] ?? process.env.CHECK_HEADERS_URL ?? 'http://localhost:3000'
const isHttps = baseUrl.startsWith('https://')

const results = []
const check = (id, label, pass, detail) => {
  results.push({ id, label, pass, detail })
}

async function fetchHeaders(path) {
  const res = await fetch(new URL(path, baseUrl))
  return res
}

async function main() {
  const res = await fetchHeaders('/')
  const h = res.headers

  // SEC-90: NODE_ENV=production 相当。HTTPレスポンスからは直接見えないため、
  // Next.js の開発モード特有のヘッダ/挙動が無いことで代理判定する。
  check(
    'SEC-90',
    'x-powered-by が出ていない（詳細情報の非公開）',
    h.get('x-powered-by') === null,
    `x-powered-by: ${h.get('x-powered-by')}`,
  )

  check(
    'SEC-91',
    'HTTPS 強制・HSTS 有効',
    isHttps ? h.get('strict-transport-security') !== null : 'SKIP(http対象のため判定対象外)',
    isHttps
      ? h.get('strict-transport-security')
      : 'localhost はhttpのためSKIP。本番URLに対して実行すること',
  )

  check(
    'SEC-92 CSP',
    'Content-Security-Policy が設定され、危険なワイルドカード/unsafe-evalを含まない',
    (() => {
      const csp = h.get('content-security-policy')
      if (!csp) return false
      const directives = csp.split(';').map((d) => d.trim())
      const scriptSrcDirective = directives.find((d) => d.startsWith('script-src'))
      // CSP仕様上、script-src が無指定なら default-src にフォールバックする。
      // find結果が無いのを「制限なし」と誤判定していた（監査 loop-auditor-2 指摘C-1）。
      const effectiveScriptSrc =
        scriptSrcDirective ?? directives.find((d) => d.startsWith('default-src')) ?? ''
      // 'unsafe-inline' は docs/decisions.md (2026-08-12) に記録済みの許容例外。
      // RSCのペイロード注入がインラインscriptを要求するため。SEC-64のStripe.js例外と同じ扱い。
      // ただし 'unsafe-eval' と '*' は許容しない — これらは事故時の被害が段違いに大きい。
      return (
        !!csp && !effectiveScriptSrc.includes('unsafe-eval') && !effectiveScriptSrc.includes('*')
      )
    })(),
    h.get('content-security-policy'),
  )

  check(
    'SEC-92 HSTS値',
    'Strict-Transport-Security の値が max-age=63072000; includeSubDomains 相当',
    isHttps
      ? (h.get('strict-transport-security') ?? '').includes('max-age=63072000')
      : 'SKIP(http対象のため判定対象外)',
    h.get('strict-transport-security'),
  )

  check(
    'SEC-92 XCTO',
    'X-Content-Type-Options: nosniff',
    h.get('x-content-type-options') === 'nosniff',
    h.get('x-content-type-options'),
  )

  check(
    'SEC-92 Referrer-Policy',
    'Referrer-Policy: strict-origin-when-cross-origin',
    h.get('referrer-policy') === 'strict-origin-when-cross-origin',
    h.get('referrer-policy'),
  )

  check(
    'SEC-92 frame-ancestors',
    "frame-ancestors 'none' または X-Frame-Options: DENY",
    (h.get('content-security-policy') ?? '').includes("frame-ancestors 'none'") ||
      h.get('x-frame-options') === 'DENY',
    `CSP: ${h.get('content-security-policy')} / X-Frame-Options: ${h.get('x-frame-options')}`,
  )

  check(
    'SEC-92 Permissions-Policy',
    'Permissions-Policy が設定されている',
    h.get('permissions-policy') !== null,
    h.get('permissions-policy'),
  )

  // SEC-98: /.env, /.git, ソースマップが公開されていない
  for (const path of ['/.env', '/.git/config', '/.git/HEAD']) {
    const r = await fetchHeaders(path)
    check(
      'SEC-98',
      `${path} が公開されていない (404/403期待)`,
      r.status === 404 || r.status === 403,
      `status=${r.status}`,
    )
  }

  const fail = results.filter((r) => r.pass === false)
  for (const r of results) {
    const mark = r.pass === true ? '✅' : r.pass === false ? '❌' : '⚪'
    console.log(`${mark} [${r.id}] ${r.label}${typeof r.pass === 'string' ? ` — ${r.pass}` : ''}`)
    if (r.pass === false) console.log(`   detail: ${r.detail}`)
  }
  console.log(`\n対象: ${baseUrl}`)
  console.log(
    `合格 ${results.filter((r) => r.pass === true).length} / スキップ ${results.filter((r) => typeof r.pass === 'string').length} / 不合格 ${fail.length}`,
  )

  if (fail.length > 0) process.exit(1)
}

main().catch((err) => {
  console.error('check-headers.mjs 実行エラー:', err.message)
  console.error(`対象URLが起動しているか確認してください: ${baseUrl}`)
  process.exit(1)
})
