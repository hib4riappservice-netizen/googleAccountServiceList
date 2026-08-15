import { describe, it, expect, vi } from 'vitest'

const { scanMock } = vi.hoisted(() => ({ scanMock: vi.fn() }))
vi.mock('@/data/gmail', () => ({ scanRegisteredServices: scanMock }))

describe('scanServicesAction', () => {
  it('DAL（scanRegisteredServices）の結果をそのまま返す', async () => {
    scanMock.mockResolvedValueOnce({ status: 'success', services: [] })
    const { scanServicesAction } = await import('@/app/actions/gmail')

    expect(await scanServicesAction()).toEqual({ status: 'success', services: [] })
    expect(scanMock).toHaveBeenCalledOnce()
  })
})
