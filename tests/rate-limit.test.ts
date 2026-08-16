import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { checkRateLimit } from '@/lib/rate-limit'

describe('checkRateLimit', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(0)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('上限回数までは許可する', () => {
    const key = `key-${Math.random()}`
    expect(checkRateLimit(key, 3, 1000)).toBe(true)
    expect(checkRateLimit(key, 3, 1000)).toBe(true)
    expect(checkRateLimit(key, 3, 1000)).toBe(true)
  })

  it('上限を超えたら拒否する', () => {
    const key = `key-${Math.random()}`
    checkRateLimit(key, 2, 1000)
    checkRateLimit(key, 2, 1000)
    expect(checkRateLimit(key, 2, 1000)).toBe(false)
  })

  it('ウィンドウが過ぎたらリセットされる', () => {
    const key = `key-${Math.random()}`
    checkRateLimit(key, 1, 1000)
    expect(checkRateLimit(key, 1, 1000)).toBe(false)

    vi.setSystemTime(1001)
    expect(checkRateLimit(key, 1, 1000)).toBe(true)
  })

  it('別のキーは独立してカウントする', () => {
    const keyA = `a-${Math.random()}`
    const keyB = `b-${Math.random()}`
    checkRateLimit(keyA, 1, 1000)
    expect(checkRateLimit(keyA, 1, 1000)).toBe(false)
    expect(checkRateLimit(keyB, 1, 1000)).toBe(true)
  })
})
