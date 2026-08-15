import { getCurrentUser } from '@/data/auth'
import { SignInButton } from '@/components/auth/SignInButton'
import { SignOutButton } from '@/components/auth/SignOutButton'
import { ScanServicesPanel } from '@/components/gmail/ScanServicesPanel'

export default async function Home() {
  const user = await getCurrentUser()

  if (!user) {
    return (
      <main>
        <h1>アカウントレーダー</h1>
        <p>Googleアカウントに紐づくサービスの一覧を確認できます。</p>
        <SignInButton />
      </main>
    )
  }

  return (
    <main>
      <h1>アカウントレーダー</h1>
      <p>{user.email} としてサインイン中です。</p>
      <SignOutButton />
      <ScanServicesPanel />
    </main>
  )
}
