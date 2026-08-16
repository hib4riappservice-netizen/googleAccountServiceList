import { signInAction } from '@/app/actions/auth'

export function SignInButton() {
  return (
    <form action={signInAction}>
      <button type="submit" className="button-primary">
        Googleでサインイン
      </button>
    </form>
  )
}
