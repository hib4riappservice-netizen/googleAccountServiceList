import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCircleInfo } from '@fortawesome/free-solid-svg-icons'
import Link from 'next/link'
import { getCurrentUser } from '@/data/auth'
import { SignInButton } from '@/components/auth/SignInButton'
import { SignOutButton } from '@/components/auth/SignOutButton'
import { ScanServicesPanel } from '@/components/gmail/ScanServicesPanel'

export default async function Home() {
  const user = await getCurrentUser()

  return (
    <main>
      {/* サイト名は常時表示のヘッダー（app/layout.tsx）側にあるため、ここでは視覚的には
          繰り返さず、ページの主題としてのh1だけをスクリーンリーダー向けに残す。 */}
      <h1 className="sr-only">アカウントレーダー</h1>

      <details className="help-disclosure">
        <summary>
          <FontAwesomeIcon icon={faCircleInfo} aria-hidden="true" />
          使い方
        </summary>
        <div className="help-disclosure-body">
          <ul>
            <li>「ようこそ」「ご登録」などの案内メールをGmail内から自動で検索します</li>
            <li>結果はCSV・Markdown・Excelでダウンロードできます</li>
          </ul>
          <p className="privacy-note">
            メール本文は取得しません。詳しくは
            <Link href="/privacy">プライバシーポリシー</Link>
            をご覧ください。
          </p>
        </div>
      </details>

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
