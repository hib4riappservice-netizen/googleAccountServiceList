import { describe, it, expect, vi } from 'vitest'

const { signInMock, signOutMock } = vi.hoisted(() => ({
  signInMock: vi.fn(),
  signOutMock: vi.fn(),
}))
vi.mock('@/auth', () => ({ auth: vi.fn(), signIn: signInMock, signOut: signOutMock }))

describe('signInAction / signOutAction', () => {
  it('signInActionはGoogleプロバイダでsignIn()を呼ぶ', async () => {
    const { signInAction } = await import('@/app/actions/auth')
    await signInAction()
    expect(signInMock).toHaveBeenCalledWith('google')
  })

  it('signOutActionはsignOut()を呼ぶ（受け入れ条件3の配線を検証）', async () => {
    const { signOutAction } = await import('@/app/actions/auth')
    await signOutAction()

    expect(signOutMock).toHaveBeenCalledOnce()
  })
})
