import { signOutAction } from '@/app/actions/auth'

export function SignOutButton() {
  return (
    <form action={signOutAction}>
      <button type="submit">サインアウト</button>
    </form>
  )
}
