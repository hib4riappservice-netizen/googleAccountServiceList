import { describe, it, expect, vi } from 'vitest'

const { authMock } = vi.hoisted(() => ({ authMock: vi.fn() }))
vi.mock('@/auth', () => ({ auth: authMock, signIn: vi.fn(), signOut: vi.fn() }))

// cache()でラップされているため、テストごとにresetModulesして作り直す（記憶漏れ防止）
async function loadGetCurrentUser() {
  vi.resetModules()
  return (await import('@/data/auth')).getCurrentUser
}

describe('getCurrentUser', () => {
  it('セッションが無い場合、nullを返す', async () => {
    authMock.mockResolvedValueOnce(null)
    expect(await (await loadGetCurrentUser())()).toBeNull()
  })

  it('セッションがある場合、DTOを返す', async () => {
    authMock.mockResolvedValueOnce({
      user: { id: 'user-1', name: '山田太郎', email: 'taro@example.com', image: null },
    })
    expect(await (await loadGetCurrentUser())()).toEqual({
      id: 'user-1',
      name: '山田太郎',
      email: 'taro@example.com',
      image: null,
    })
  })

  it('auth()が例外を投げた場合、安全側に倒してnullを返し、ログに残す（SEC-80/81）', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    authMock.mockRejectedValueOnce(new Error('boom'))
    expect(await (await loadGetCurrentUser())()).toBeNull()
    expect(consoleError).toHaveBeenCalledOnce()
    consoleError.mockRestore()
  })

  it('Next.jsのDYNAMIC_SERVER_USAGEシグナルはログに残さず伝播させる', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const nextSignal = Object.assign(new Error('dynamic'), { digest: 'DYNAMIC_SERVER_USAGE' })
    authMock.mockRejectedValueOnce(nextSignal)
    await expect((await loadGetCurrentUser())()).rejects.toBe(nextSignal)
    expect(consoleError).not.toHaveBeenCalled()
    consoleError.mockRestore()
  })
})
