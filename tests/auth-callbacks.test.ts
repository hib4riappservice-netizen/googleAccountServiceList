import { describe, it, expect } from 'vitest'
import { jwtCallback, sessionCallback } from '@/lib/auth-callbacks'

// 回帰テスト: gmail.readonly権限を持つアクセストークンがsession()（ブラウザに届く）に
// 漏れないこと。壊れると重大な情報漏洩になる（docs/decisions.md参照）。
describe('auth callbacks', () => {
  it('jwt()はaccount由来のトークンをtokenに載せる', async () => {
    const token = await jwtCallback({
      token: { sub: 'user-1' },
      account: {
        provider: 'google',
        providerAccountId: 'g-1',
        type: 'oauth',
        access_token: 'secret-access-token',
        refresh_token: 'secret-refresh-token',
      },
    })
    expect(token).toMatchObject({
      accessToken: 'secret-access-token',
      refreshToken: 'secret-refresh-token',
    })
  })

  it('jwt()はaccountが無ければtokenを変更しない', async () => {
    expect(await jwtCallback({ token: { sub: 'user-1' }, account: null })).toEqual({
      sub: 'user-1',
    })
  })

  it('session()はaccessToken/refreshTokenを一切含めない', async () => {
    const session = await sessionCallback({
      session: { user: { id: '', name: null, email: null, image: null }, expires: '' },
      token: {
        sub: 'user-1',
        accessToken: 'secret-access-token',
        refreshToken: 'secret-refresh-token',
      },
    })
    const serialized = JSON.stringify(session)
    expect(serialized).not.toContain('secret-access-token')
    expect(serialized).not.toContain('secret-refresh-token')
    expect(session).not.toHaveProperty('accessToken')
    expect(session.user?.id).toBe('user-1')
  })
})
