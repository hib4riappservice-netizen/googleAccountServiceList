import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ScanServicesPanel } from '@/components/gmail/ScanServicesPanel'

const { scanServicesActionMock, writeXlsxFileMock, toFileMock } = vi.hoisted(() => {
  const toFileMock = vi.fn().mockResolvedValue(undefined)
  return {
    scanServicesActionMock: vi.fn(),
    writeXlsxFileMock: vi.fn(() => ({ toFile: toFileMock })),
    toFileMock,
  }
})
vi.mock('@/app/actions/gmail', () => ({ scanServicesAction: scanServicesActionMock }))
vi.mock('write-excel-file/browser', () => ({ default: writeXlsxFileMock }))

const sampleService = {
  name: 'Example',
  senderDomain: 'example.com',
  accessUrl: 'https://example.com',
  subject: 'x',
  receivedAt: 'd',
}

describe('ScanServicesPanel', () => {
  beforeEach(() => {
    // jsdomはURL.createObjectURLを実装していないため、ダウンロードボタンのクリックを
    // 固定して検証できるようにする（TEST-03: ブラウザAPIを固定する）
    vi.stubGlobal(
      'URL',
      Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:mock'), revokeObjectURL: vi.fn() }),
    )
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  })

  it('検出結果が0件の場合、空状態を表示する（エラー扱いにしない）', async () => {
    scanServicesActionMock.mockResolvedValueOnce({ status: 'success', services: [] })
    const user = userEvent.setup()
    render(<ScanServicesPanel />)

    await user.click(screen.getByRole('button', { name: 'スキャン開始' }))

    expect(await screen.findByText(/登録済みサービスは見つかりませんでした/)).toBeInTheDocument()
  })

  it('検出結果がある場合、件数・一覧・アクセスリンク・ダウンロードボタンを表示する', async () => {
    scanServicesActionMock.mockResolvedValueOnce({ status: 'success', services: [sampleService] })
    const user = userEvent.setup()
    render(<ScanServicesPanel />)

    await user.click(screen.getByRole('button', { name: 'スキャン開始' }))

    expect(await screen.findByText('1件のサービスが見つかりました')).toBeInTheDocument()
    const listItem = await screen.findByRole('listitem')
    expect(listItem).toHaveTextContent('Example')
    expect(listItem).toHaveTextContent('example.com')
    const link = screen.getByRole('link', { name: 'サイトを開く' })
    expect(link).toHaveAttribute('href', 'https://example.com')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    expect(screen.getByRole('button', { name: 'CSV' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Markdown' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Excel' })).toBeInTheDocument()
  })

  it('CSVを押すとファイル生成処理が呼ばれる', async () => {
    scanServicesActionMock.mockResolvedValueOnce({ status: 'success', services: [sampleService] })
    const user = userEvent.setup()
    render(<ScanServicesPanel />)
    await user.click(screen.getByRole('button', { name: 'スキャン開始' }))
    await user.click(await screen.findByRole('button', { name: 'CSV' }))

    expect(URL.createObjectURL).toHaveBeenCalledOnce()
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledOnce()
  })

  it('Excelを押すとxlsx生成処理が呼ばれる', async () => {
    scanServicesActionMock.mockResolvedValueOnce({ status: 'success', services: [sampleService] })
    const user = userEvent.setup()
    render(<ScanServicesPanel />)
    await user.click(screen.getByRole('button', { name: 'スキャン開始' }))
    await user.click(await screen.findByRole('button', { name: 'Excel' }))

    expect(writeXlsxFileMock).toHaveBeenCalledOnce()
    expect(toFileMock).toHaveBeenCalledWith('registered-services.xlsx')
  })

  it('unauthorizedの場合、サインインを促すメッセージを表示する', async () => {
    scanServicesActionMock.mockResolvedValueOnce({ status: 'unauthorized' })
    const user = userEvent.setup()
    render(<ScanServicesPanel />)

    await user.click(screen.getByRole('button', { name: 'スキャン開始' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('サインインし直してください。')
  })

  it('rate_limitedの場合、連打を示すメッセージを表示する', async () => {
    scanServicesActionMock.mockResolvedValueOnce({ status: 'rate_limited' })
    const user = userEvent.setup()
    render(<ScanServicesPanel />)

    await user.click(screen.getByRole('button', { name: 'スキャン開始' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('少し時間をおいてから再試行')
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
