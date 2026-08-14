import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '01_xxx',
  description: '準備中',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  )
}
