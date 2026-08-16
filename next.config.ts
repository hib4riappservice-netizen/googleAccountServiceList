import type { NextConfig } from 'next'
import { withSentryConfig } from '@sentry/nextjs'

// Sentryへのエラー送信はブラウザからの直接fetchのため、CSPのconnect-srcに
// 明示的に許可しないとブロックされて何も送信されない（自己ホストのconnect-src 'self'とは別ホスト）。
// 値が壊れている場合（コピペミス等）はビルドを落とさず、connect-srcを広げないほうに倒す。
function getSentryIngestHost(): string | null {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return null
  try {
    return new URL(process.env.NEXT_PUBLIC_SENTRY_DSN).host
  } catch {
    return null
  }
}
const sentryIngestHost = getSentryIngestHost()

// checklists/release.md SEC-90〜92, 98 の実装。scripts/check-headers.mjs で機械検証する。
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      // Next.js は RSC のペイロードを渡すインラインscriptを注入する。
      // 'unsafe-inline' を外すと実際にハイドレーションが壊れる
      // （`next start` + Playwright で実測: React error #412、CSP違反2件）。
      // nonceベースのCSP（middleware.tsで生成）にすればより厳格化できるが、
      // 現時点ではペイロードに機微情報を含む機能が無いため、この妥協点を記録して採用する。
      // devモードのみ'unsafe-eval'も許可する: Reactの開発時デバッグ機能（スタックトレース復元等）が
      // eval()を使うため、無いとNext.js DevToolsに「1 Issue」が出る（本番ビルドはevalを使わない）。
      `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : ''}`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data:",
      "font-src 'self'",
      `connect-src 'self'${sentryIngestHost ? ` https://${sentryIngestHost}` : ''}`,
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  },
]

if (process.env.NODE_ENV === 'production') {
  securityHeaders.push({
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains',
  })
}

const nextConfig: NextConfig = {
  // SEC-90: レスポンスから詳細情報（フレームワーク名）を出さない
  poweredByHeader: false,
  // 開発者向けの「N」バッジ（左下）を無効化する。コンパイル/実行時エラーの表示自体は
  // 無効化されない（Next.js公式ドキュメントで明記）。footerのリンクと重なって見えたため。
  devIndicators: false,
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }]
  },
}

// SENTRY_AUTH_TOKENは未設定（無料プランの範囲でソースマップアップロードは今回スコープ外、
// docs/decisions.md参照）。無い場合はビルド自体は成功し、アップロードだけがスキップされる。
export default withSentryConfig(nextConfig, {
  org: 'hib4ri',
  project: 'javascript-nextjs',
  silent: !process.env.CI,
})
