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

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('googleAccountServiceList')
    expect(screen.getByRole('button', { name: 'Googleでサインイン' })).toBeInTheDocument()
  })

  it('サインイン済みなら表示名とサインアウトボタンを表示する', async () => {
    getCurrentUserMock.mockResolvedValueOnce({
      id: 'user-1',
      name: '山田太郎',
      email: 'taro@example.com',
      image: null,
    })
    render(await Home())

    expect(screen.getByText('山田太郎 としてサインイン中です。')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'サインアウト' })).toBeInTheDocument()
  })

  it('nameが無い場合、emailを表示する', async () => {
    getCurrentUserMock.mockResolvedValueOnce({
      id: 'user-1',
      name: null,
      email: 'taro@example.com',
      image: null,
    })
    render(await Home())

    expect(screen.getByText('taro@example.com としてサインイン中です。')).toBeInTheDocument()
  })
})
