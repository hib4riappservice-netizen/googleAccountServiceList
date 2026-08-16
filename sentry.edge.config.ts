import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0,
  // instrumentation-client.tsと同じ理由（Cookie/ヘッダーを構造的に除外する）。
  dataCollection: { cookies: false, httpHeaders: { request: false, response: false } },
})
