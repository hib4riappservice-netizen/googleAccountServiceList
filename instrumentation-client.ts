import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  // このアプリの目的は未捕捉例外の検知のみ。パフォーマンストレーシング/リプレイは
  // 別枠のクォータを消費するため意図的に有効化しない（docs/decisions.md参照）。
  tracesSampleRate: 0,
  // sendDefaultPii(既定false)はCookie/ヘッダーを名前ベースで一部除外するだけで、
  // 全面的な非送信を保証しない（レビューで指摘）。個人情報を一切送らない方針を
  // 構造的に保証するため明示的に無効化する。
  dataCollection: { cookies: false, httpHeaders: { request: false, response: false } },
})

// SDKが要求する必須フック（無いとビルド時に警告が出る）。ページ遷移の計測に使うが
// tracesSampleRate: 0のため実質的にデータは送信されない。
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
