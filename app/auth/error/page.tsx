import Link from 'next/link'
import { z } from 'zod'

// Auth.js の pages.error 用ページ。認証まわりの例外はここに来る（app/error.tsx の境界は通らない）。
// ERR-01: ユーザー起因 / 外部起因 / 想定外 で扱いを変える。内部情報（コード名等）は出さない。
type Props = {
  searchParams: Promise<{ error?: string }>
}

// P1: 外部（Auth.jsのリダイレクト、= 実質URLクエリ）から来た値は境界で検証する。
// 未知のキー（例: "__proto__"）でオブジェクト参照するリスクを、既知の値のみ許可することで防ぐ。
const knownErrorCode = z.enum(['AccessDenied', 'OAuthSignin', 'OAuthCallback'])

const messages: Record<z.infer<typeof knownErrorCode>, { title: string; body: string }> = {
  AccessDenied: {
    title: 'サインインが許可されませんでした',
    body: 'Googleアカウント側でアクセスが拒否されました。テストユーザーとして登録されていないアカウントの可能性があります。',
  },
  OAuthSignin: {
    title: '一時的な問題が発生しました',
    body: 'Google側で問題が発生した可能性があります。時間をおいて再試行してください。',
  },
  OAuthCallback: {
    title: '一時的な問題が発生しました',
    body: 'Google側で問題が発生した可能性があります。時間をおいて再試行してください。',
  },
}

export default async function AuthErrorPage({ searchParams }: Props) {
  const { error } = await searchParams
  const parsed = knownErrorCode.safeParse(error)

  if (parsed.success) {
    const info = messages[parsed.data]
    return (
      <main>
        <h1>{info.title}</h1>
        <p>{info.body}</p>
        <Link href="/">トップに戻る</Link>
      </main>
    )
  }

  // 想定外（未知のエラーコード、またはerrorパラメータ無し）。
  // 内部のコード名は画面に出さず、相関可能なエラーIDだけを見せる（ERR-01/SEC-83）。
  const errorId = crypto.randomUUID()
  console.error('[auth/error] unexpected auth error code', { code: error, errorId })

  return (
    <main>
      <h1>問題が発生しました</h1>
      <p>時間をおいて再試行してください。解決しない場合はエラーIDとともにお問い合わせください。</p>
      <p>エラーID: {errorId}</p>
      <Link href="/">トップに戻る</Link>
      <Link href="/contact">お問い合わせ</Link>
    </main>
  )
}
