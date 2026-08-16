'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'

// ERR-02 (MUST): ルートセグメントごとの error.tsx。
// ERR-01 (MUST): 想定外エラーの詳細（スタック等）をユーザーに出さない。
// 相関可能なエラーID（digest）だけを見せる。
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  // error.tsxはグローバルのエラーハンドリングより優先されるため、ここで明示的に送信しないと
  // Sentryに届かない（Sentry公式ドキュメントの既知の注意点）。
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <div role="alert">
      <h2>問題が発生しました</h2>
      <p>時間をおいて再試行してください。</p>
      {error.digest ? <p>エラーID: {error.digest}</p> : null}
      <button type="button" onClick={reset}>
        再試行
      </button>
    </div>
  )
}
