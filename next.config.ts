import type { NextConfig } from 'next'

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
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data:",
      "font-src 'self'",
      "connect-src 'self'",
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
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }]
  },
}

export default nextConfig
