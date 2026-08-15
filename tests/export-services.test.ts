import { describe, it, expect } from 'vitest'
import { toCsv, toMarkdown } from '@/lib/export-services'
import type { DetectedService } from '@/lib/detect-services'

const sample: DetectedService[] = [
  {
    name: 'Example',
    senderDomain: 'example.com',
    accessUrl: 'https://example.com',
    subject: 'ようこそ',
    receivedAt: '2026-08-15',
  },
]

describe('toCsv', () => {
  it('ヘッダー行とデータ行をCRLF区切りで出力する', () => {
    const csv = toCsv(sample)
    const lines = csv.split('\r\n')
    expect(lines[0]).toBe('サービス名,送信元ドメイン,アクセスURL,件名,受信日')
    expect(lines[1]).toBe('Example,example.com,https://example.com,ようこそ,2026-08-15')
  })

  it('カンマ・ダブルクォート・改行を含む値は引用符で囲みエスケープする', () => {
    const csv = toCsv([{ ...sample[0]!, name: '"Example", Inc.\n本社' }])
    expect(csv).toContain('"""Example"", Inc.\n本社"')
  })

  it('空配列の場合、ヘッダー行のみを返す', () => {
    expect(toCsv([]).split('\r\n')).toEqual(['サービス名,送信元ドメイン,アクセスURL,件名,受信日'])
  })
})

describe('toMarkdown', () => {
  it('Markdownテーブルとしてリンク付きで出力する', () => {
    const md = toMarkdown(sample)
    expect(md).toContain('| サービス名 | 送信元ドメイン | アクセスURL | 件名 | 受信日 |')
    expect(md).toContain('| --- | --- | --- | --- | --- |')
    expect(md).toContain(
      '| Example | example.com | [https://example.com](https://example.com) | ようこそ | 2026-08-15 |',
    )
  })

  it('空配列の場合、ヘッダーと区切り行のみを返す', () => {
    const md = toMarkdown([])
    expect(md.split('\n')).toHaveLength(2)
  })
})
