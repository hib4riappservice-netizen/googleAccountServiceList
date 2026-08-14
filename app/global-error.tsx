'use client'

// ERR-02 (MUST): グローバルの global-error.tsx。
// ルートレイアウト自体が落ちた場合の最終防衛線なので html/body から自前で描画する。
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="ja">
      <body>
        <div role="alert">
          <h2>問題が発生しました</h2>
          <p>時間をおいて再試行してください。</p>
          {error.digest ? <p>エラーID: {error.digest}</p> : null}
          <button type="button" onClick={reset}>
            再試行
          </button>
        </div>
      </body>
    </html>
  )
}
