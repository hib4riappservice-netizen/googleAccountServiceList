import type { Metadata } from 'next'
import Link from 'next/link'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSatelliteDish } from '@fortawesome/free-solid-svg-icons'
import './globals.css'

export const metadata: Metadata = {
  title: 'アカウントレーダー',
  description: 'Googleアカウントに紐づくサービスの一覧を確認できます。',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        {/* サイト全体で常時表示するヘッダー。各ページからトップに戻れないという指摘への対応
            （/privacy・/terms・/contact 等の下層ページにも同じヘッダーが乗る）。 */}
        <div className="app-shell">
          <header className="site-header">
            <Link href="/" className="site-logo">
              <FontAwesomeIcon icon={faSatelliteDish} aria-hidden="true" />
              <span>アカウントレーダー</span>
            </Link>
          </header>
          <div className="scroll-area">{children}</div>
          <footer>
            <Link href="/privacy">プライバシーポリシー</Link>
            <Link href="/terms">利用規約</Link>
            <Link href="/contact">お問い合わせ</Link>
          </footer>
        </div>
      </body>
    </html>
  )
}
