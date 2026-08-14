'use client'

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
