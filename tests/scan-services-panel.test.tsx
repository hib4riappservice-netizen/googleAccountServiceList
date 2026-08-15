import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ScanServicesPanel } from '@/components/gmail/ScanServicesPanel'

const { scanServicesActionMock } = vi.hoisted(() => ({ scanServicesActionMock: vi.fn() }))
vi.mock('@/app/actions/gmail', () => ({ scanServicesAction: scanServicesActionMock }))

describe('ScanServicesPanel', () => {
  it('検出結果が0件の場合、空状態を表示する（エラー扱いにしない）', async () => {
    scanServicesActionMock.mockResolvedValueOnce({ status: 'success', services: [] })
    const user = userEvent.setup()
    render(<ScanServicesPanel />)

    await user.click(screen.getByRole('button', { name: 'スキャン開始' }))

    expect(await screen.findByText('登録済みサービスは見つかりませんでした。')).toBeInTheDocument()
  })

  it('検出結果がある場合、一覧を表示する', async () => {
    scanServicesActionMock.mockResolvedValueOnce({
      status: 'success',
      services: [{ name: 'Example', senderDomain: 'example.com', subject: 'x', receivedAt: 'd' }],
    })
    const user = userEvent.setup()
    render(<ScanServicesPanel />)

    await user.click(screen.getByRole('button', { name: 'スキャン開始' }))

    expect(await screen.findByText('Example（example.com）')).toBeInTheDocument()
  })

  it('unauthorizedの場合、サインインを促すメッセージを表示する', async () => {
    scanServicesActionMock.mockResolvedValueOnce({ status: 'unauthorized' })
    const user = userEvent.setup()
    render(<ScanServicesPanel />)

    await user.click(screen.getByRole('button', { name: 'スキャン開始' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('サインインし直してください。')
  })

  it('errorの場合、何が起きたか・次の行動・エラーIDを表示し、内部情報は出さない', async () => {
    scanServicesActionMock.mockResolvedValueOnce({ status: 'error', errorId: 'test-error-id' })
    const user = userEvent.setup()
    render(<ScanServicesPanel />)

    await user.click(screen.getByRole('button', { name: 'スキャン開始' }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Gmailの読み込みに失敗しました')
    expect(alert).toHaveTextContent('時間をおいて再試行してください')
    expect(alert).toHaveTextContent('test-error-id')
  })
})
