import { getCurrentUser } from '@/data/auth'
import { SignInButton } from '@/components/auth/SignInButton'
import { SignOutButton } from '@/components/auth/SignOutButton'
import { ScanServicesPanel } from '@/components/gmail/ScanServicesPanel'

export default async function Home() {
  const user = await getCurrentUser()

  return (
    <main>
      <header className="app-header">
        <h1>アカウントレーダー</h1>
        <p className="tagline">
          Gmailの受信トレイを検索し、これまで登録したオンラインサービスの一覧を作ります。
        </p>
      </header>

      <section className="intro" aria-label="このサービスについて">
        <ul>
          <li>「ようこそ」「ご登録」などの案内メールを自動で検索します</li>
          <li>読み取るのは件名・送信元・受信日時のみで、本文は取得しません</li>
          <li>結果はCSV・Markdown・Excelでダウンロードできます</li>
        </ul>
      </section>

      {!user && (
        <section className="section">
          <h2>はじめる</h2>
          <SignInButton />
        </section>
      )}

      {user && (
        <>
          <section className="section account-bar">
            <p>
              <strong>{user.email}</strong> としてサインイン中です。
            </p>
            <SignOutButton />
          </section>

          <section className="section">
            <h2>スキャン</h2>
            <ScanServicesPanel />
          </section>
        </>
      )}
    </main>
  )
}
