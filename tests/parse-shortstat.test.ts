import { describe, it, expect } from 'vitest'
import { parseShortstat } from '@/lib/parse-shortstat'

describe('parseShortstat', () => {
  it('2 files changed, 10 insertions(+), 3 deletions(-) を { insertions: 10, deletions: 3 } に変換する', () => {
    expect(parseShortstat('2 files changed, 10 insertions(+), 3 deletions(-)')).toEqual({
      insertions: 10,
      deletions: 3,
    })
  })

  it('deletionsが無い場合は0を返す', () => {
    expect(parseShortstat('1 file changed, 5 insertions(+)')).toEqual({
      insertions: 5,
      deletions: 0,
    })
  })

  it('空文字列（差分なし）は insertions: 0, deletions: 0 を返す', () => {
    expect(parseShortstat('')).toEqual({ insertions: 0, deletions: 0 })
  })
})
