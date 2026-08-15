import type { Account, Session } from 'next-auth'
import type { JWT } from 'next-auth/jwt'

// auth.tsから切り出した純粋関数。next-auth本体を実行時importしないため
// Vitestで単体テストできる（理由はdocs/decisions.md参照）。

export async function jwtCallback({
  token,
  account,
}: {
  token: JWT
  account?: Account | null
}): Promise<JWT> {
  // account は初回サインイン時にのみ渡される
  if (account?.access_token) {
    token.accessToken = account.access_token
  }
  if (account?.refresh_token) {
    token.refreshToken = account.refresh_token
  }
  return token
}

export async function sessionCallback({
  session,
  token,
}: {
  session: Session
  token: JWT
}): Promise<Session> {
  // accessToken/refreshTokenは意図的に含めない（XSS時の窃取防止。decisions.md参照）
  if (session.user) {
    session.user.id = token.sub ?? ''
  }
  return session
}
