import { describe, it, expect, vi, beforeEach } from 'vitest'

const { getTokenMock } = vi.hoisted(() => ({ getTokenMock: vi.fn() }))
vi.mock('next-auth/jwt', () => ({ getToken: getTokenMock }))
vi.mock('next/headers', () => ({ headers: vi.fn().mockResolvedValue(new Headers()) }))

async function loadScan() {
  vi.resetModules()
  return (await import('@/data/gmail')).scanRegisteredServices
}

function messageResponse(from: string, subject: string, date: string) {
  return new Response(
    JSON.stringify({
      payload: {
        headers: [
          { name: 'From', value: from },
          { name: 'Subject', value: subject },
          { name: 'Date', value: date },
        ],
      },
    }),
    { status: 200 },
  )
}

describe('scanRegisteredServices', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('fetch', vi.fn())
  })

  it('アクセストークンが無ければunauthorizedを返す', async () => {
    getTokenMock.mockResolvedValueOnce(null)
    const scan = await loadScan()
    expect(await scan()).toEqual({ status: 'unauthorized' })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('getToken()にsecretを明示的に渡す（省略すると実行時に例外になるため回帰防止）', async () => {
    getTokenMock.mockResolvedValueOnce(null)
    const scan = await loadScan()
    await scan()
    expect(getTokenMock).toHaveBeenCalledWith(
      expect.objectContaining({ secret: expect.anything() }),
    )
  })

  it('Gmail一覧APIが失敗したらerrorを返し、ログに残す', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    getTokenMock.mockResolvedValueOnce({ accessToken: 'token-1' })
    vi.mocked(fetch).mockResolvedValueOnce(new Response('', { status: 401 }))
    const scan = await loadScan()
    expect(await scan()).toEqual({ status: 'error', errorId: expect.any(String) })
    expect(consoleError).toHaveBeenCalledOnce()
    consoleError.mockRestore()
  })

  it('fetchが例外を投げたらerrorを返す（安全側）', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    getTokenMock.mockResolvedValueOnce({ accessToken: 'token-1' })
    vi.mocked(fetch).mockRejectedValueOnce(new Error('network down'))
    const scan = await loadScan()
    expect(await scan()).toEqual({ status: 'error', errorId: expect.any(String) })
    expect(consoleError).toHaveBeenCalledOnce()
    consoleError.mockRestore()
  })

  it('該当メールが無い場合、エラーではなく空のsuccessを返す', async () => {
    getTokenMock.mockResolvedValueOnce({ accessToken: 'token-1' })
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ messages: [] }), { status: 200 }),
    )
    const scan = await loadScan()
    expect(await scan()).toEqual({ status: 'success', services: [] })
  })

  it('messagesフィールドが無い一覧レスポンスも空のsuccessとして扱う', async () => {
    getTokenMock.mockResolvedValueOnce({ accessToken: 'token-1' })
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 200 }))
    const scan = await loadScan()
    expect(await scan()).toEqual({ status: 'success', services: [] })
  })

  it('個別メッセージの取得が一部失敗しても、残りだけでsuccessを返す', async () => {
    getTokenMock.mockResolvedValueOnce({ accessToken: 'token-1' })
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ messages: [{ id: 'm1' }, { id: 'm2' }] }), { status: 200 }),
      )
      .mockResolvedValueOnce(new Response('', { status: 404 })) // m1: 失敗
      .mockResolvedValueOnce(messageResponse('a@example.com', 'ようこそ', 'd1')) // m2: 成功
    const scan = await loadScan()
    expect(await scan()).toEqual({
      status: 'success',
      services: [
        { name: 'example.com', senderDomain: 'example.com', subject: 'ようこそ', receivedAt: 'd1' },
      ],
    })
  })

  it('複数件のメッセージから複数ドメインを検出する', async () => {
    getTokenMock.mockResolvedValueOnce({ accessToken: 'token-1' })
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ messages: [{ id: 'm1' }, { id: 'm2' }] }), { status: 200 }),
      )
      .mockResolvedValueOnce(messageResponse('a@example.com', 'ようこそ', 'd1'))
      .mockResolvedValueOnce(messageResponse('b@other.example', '確認', 'd2'))
    const scan = await loadScan()
    const result = await scan()
    expect(result.status).toBe('success')
    expect(result.status === 'success' && result.services).toHaveLength(2)
  })

  it('一覧APIのmessages要素にidが無い/文字列でない場合は無視する', async () => {
    getTokenMock.mockResolvedValueOnce({ accessToken: 'token-1' })
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ messages: [{}, { id: 42 }, 'not-an-object'] }), {
        status: 200,
      }),
    )
    const scan = await loadScan()
    expect(await scan()).toEqual({ status: 'success', services: [] })
    expect(fetch).toHaveBeenCalledTimes(1) // 個別取得は一度も呼ばれない
  })

  it('個別メッセージにpayload/headersが無い場合は除外する', async () => {
    getTokenMock.mockResolvedValueOnce({ accessToken: 'token-1' })
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ messages: [{ id: 'm1' }] }), { status: 200 }),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 200 }))
    const scan = await loadScan()
    expect(await scan()).toEqual({ status: 'success', services: [] })
  })

  it('Fromヘッダーが無いメッセージは除外する', async () => {
    getTokenMock.mockResolvedValueOnce({ accessToken: 'token-1' })
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ messages: [{ id: 'm1' }] }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ payload: { headers: [{ name: 'Subject', value: 'x' }] } }), {
          status: 200,
        }),
      )
    const scan = await loadScan()
    expect(await scan()).toEqual({ status: 'success', services: [] })
  })

  it('一覧取得→ヘッダー取得→検出結果DTOを返す', async () => {
    getTokenMock.mockResolvedValueOnce({ accessToken: 'token-1' })
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ messages: [{ id: 'm1' }] }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        messageResponse('Example <noreply@example.com>', 'ようこそ', '2026-08-15'),
      )
    const scan = await loadScan()
    expect(await scan()).toEqual({
      status: 'success',
      services: [
        {
          name: 'Example',
          senderDomain: 'example.com',
          subject: 'ようこそ',
          receivedAt: '2026-08-15',
        },
      ],
    })
  })
})
