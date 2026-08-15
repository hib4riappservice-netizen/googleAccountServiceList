import { encode } from 'next-auth/jwt'
import type { BrowserContext } from '@playwright/test'

// E2Eでは実Googleアカウントを使わず、アプリ自身が信頼するセッションCookieを
// next-auth/jwtのencode()で直接発行する（AUTH_SECRETはCI/ローカルとも
// テスト用ダミー値。本物のGoogleトークンは含めない＝Gmail走査自体は手動確認の対象のまま）。
const SESSION_COOKIE_NAME = 'authjs.session-token'

export async function signInAsTestUser(context: BrowserContext) {
  const secret = process.env.AUTH_SECRET
  if (!secret) throw new Error('AUTH_SECRET is not set (required to sign the test session cookie)')

  const value = await encode({
    token: { sub: 'e2e-test-user', name: 'E2E Test User', email: 'e2e-test@example.com' },
    secret,
    salt: SESSION_COOKIE_NAME,
  })

  await context.addCookies([
    {
      name: SESSION_COOKIE_NAME,
      value,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      sameSite: 'Lax',
    },
  ])
}
