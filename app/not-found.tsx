import Link from 'next/link'

// ERR-02 (MUST): not-found.tsx
export default function NotFound() {
  return (
    <div>
      <h2>ページが見つかりません</h2>
      <Link href="/">トップへ戻る</Link>
    </div>
  )
}
