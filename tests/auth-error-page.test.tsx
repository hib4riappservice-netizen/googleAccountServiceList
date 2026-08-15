import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import AuthErrorPage from '@/app/auth/error/page'

function renderWithError(error?: string) {
  const params = error === undefined ? {} : { error }
  return AuthErrorPage({ searchParams: Promise.resolve(params) })
}

describe('AuthErrorPage', () => {
  it('AccessDenied: ユーザー起因のメッセージを表示する', async () => {
    render(await renderWithError('AccessDenied'))
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'サインインが許可されませんでした',
    )
  })

  it('OAuthSignin: 外部起因のメッセージを表示する', async () => {
    render(await renderWithError('OAuthSignin'))
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      '一時的な問題が発生しました',
    )
  })

  it('OAuthCallback: 外部起因のメッセージを表示する', async () => {
    render(await renderWithError('OAuthCallback'))
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      '一時的な問題が発生しました',
    )
  })

  it('未知のエラーコード: 想定外エラーとしてfallbackを表示し、内部コードを出さずエラーIDとお問い合わせ導線を出す', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(await renderWithError('Configuration'))

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('問題が発生しました')
    expect(screen.queryByText('Configuration')).not.toBeInTheDocument()
    expect(screen.getByText(/^エラーID: /)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'お問い合わせ' })).toHaveAttribute('href', '/contact')
    expect(consoleError).toHaveBeenCalledOnce()

    consoleError.mockRestore()
  })

  it('errorパラメータが無い場合もfallbackを表示する', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(await renderWithError(undefined))

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('問題が発生しました')

    consoleError.mockRestore()
  })
})
