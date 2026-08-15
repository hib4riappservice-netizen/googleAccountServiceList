import { describe, it, expect } from 'vitest'
import { detectRegisteredServices } from '@/lib/detect-services'

function header(from: string) {
  return { id: '1', subject: 'ようこそ', from, receivedAt: 'd1' }
}

describe('detectRegisteredServices', () => {
  it('Fromヘッダーから表示名とドメインを抽出する', () => {
    const result = detectRegisteredServices([
      {
        id: '1',
        subject: 'ようこそ',
        from: 'Example Service <noreply@example.com>',
        receivedAt: 'd1',
      },
    ])
    expect(result).toEqual([
      {
        name: 'Example Service',
        senderDomain: 'example.com',
        subject: 'ようこそ',
        receivedAt: 'd1',
      },
    ])
  })

  it('ダブルクォート付きの表示名からクォートを除去する', () => {
    const result = detectRegisteredServices([header('"Example Service" <a@example.com>')])
    expect(result[0]?.name).toBe('Example Service')
  })

  it('表示名が無い場合、ドメインを名前として使う', () => {
    const result = detectRegisteredServices([header('noreply@example.com')])
    expect(result[0]).toMatchObject({ name: 'example.com', senderDomain: 'example.com' })
  })

  it('ドメインを大文字小文字問わず正規化し、重複排除にも反映する', () => {
    const result = detectRegisteredServices([
      header('a@EXAMPLE.com'),
      { id: '2', subject: '確認', from: 'b@example.COM', receivedAt: 'd2' },
    ])
    expect(result).toHaveLength(1)
    expect(result[0]?.senderDomain).toBe('example.com')
  })

  it('同じ送信元ドメインは重複させず、最初の1件だけ残す', () => {
    const result = detectRegisteredServices([
      { id: '1', subject: 'ようこそ', from: 'a@example.com', receivedAt: 'd1' },
      { id: '2', subject: '確認', from: 'b@example.com', receivedAt: 'd2' },
    ])
    expect(result).toHaveLength(1)
    expect(result[0]?.subject).toBe('ようこそ')
  })

  it('Fromヘッダーが解析できない場合は無視する', () => {
    expect(detectRegisteredServices([header('')])).toEqual([])
  })

  it('空白のみのFromヘッダーは無視する', () => {
    expect(detectRegisteredServices([header('   ')])).toEqual([])
  })

  it('メールアドレス部が空の山括弧は無視する', () => {
    expect(detectRegisteredServices([header('Example <>')])).toEqual([])
  })

  it('@が先頭の不正なアドレスは無視する', () => {
    expect(detectRegisteredServices([header('@example.com')])).toEqual([])
  })

  it('@が末尾の不正なアドレスは無視する', () => {
    expect(detectRegisteredServices([header('user@')])).toEqual([])
  })

  it('@が複数含まれる場合は最後の@以降をドメインとする', () => {
    const result = detectRegisteredServices([header('a@b@example.com')])
    expect(result[0]?.senderDomain).toBe('example.com')
  })

  it('空配列に対しては空配列を返す', () => {
    expect(detectRegisteredServices([])).toEqual([])
  })
})
