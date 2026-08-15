import { getCurrentUser } from '@/data/auth'
import { SignInButton } from '@/components/auth/SignInButton'
import { SignOutButton } from '@/components/auth/SignOutButton'

export default async function Home() {
  const user = await getCurrentUser()

  if (!user) {
    return (
      <main>
        <h1>googleAccountServiceList</h1>
        <p>Googleアカウントに紐づくサービスの一覧を確認できます。</p>
        <SignInButton />
      </main>
    )
  }

  return (
    <main>
      <h1>googleAccountServiceList</h1>
      <p>{user.name ?? user.email} としてサインイン中です。</p>
      <SignOutButton />
    </main>
  )
}
