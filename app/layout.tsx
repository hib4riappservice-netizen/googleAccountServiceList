import type { Metadata } from 'next'
import Link from 'next/link'
import './globals.css'

export const metadata: Metadata = {
  title: 'アカウントレーダー',
  description: 'Googleアカウントに紐づくサービスの一覧を確認できます。',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        {children}
        <footer>
          <Link href="/privacy">プライバシーポリシー</Link>
          <Link href="/terms">利用規約</Link>
          <Link href="/contact">お問い合わせ</Link>
        </footer>
      </body>
    </html>
  )
}
