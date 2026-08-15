import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'googleAccountServiceList',
  description: 'Googleアカウントに紐づくサービスの一覧を確認できます。',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  )
}
