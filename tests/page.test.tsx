import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import Home from '@/app/page'

vi.mock('@/auth', () => ({ auth: vi.fn(), signIn: vi.fn(), signOut: vi.fn() }))
const { getCurrentUserMock } = vi.hoisted(() => ({ getCurrentUserMock: vi.fn() }))
vi.mock('@/data/auth', () => ({ getCurrentUser: getCurrentUserMock }))

describe('Home', () => {
  it('未サインインならサインインボタンを表示する', async () => {
    getCurrentUserMock.mockResolvedValueOnce(null)
    render(await Home())

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('アカウントレーダー')
    expect(screen.getByRole('button', { name: 'Googleでサインイン' })).toBeInTheDocument()
  })

  it('サインイン済みならメールアドレスとサインアウトボタンを表示する（表示名は使わない）', async () => {
    getCurrentUserMock.mockResolvedValueOnce({
      id: 'user-1',
      name: '山田太郎',
      email: 'taro@example.com',
      image: null,
    })
    const { container } = render(await Home())

    expect(container).toHaveTextContent('taro@example.com としてサインイン中です。')
    expect(screen.queryByText(/山田太郎/)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'サインアウト' })).toBeInTheDocument()
  })
})
