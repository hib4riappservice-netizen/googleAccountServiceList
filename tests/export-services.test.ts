import { describe, it, expect } from 'vitest'
import { toCsv, toMarkdown, toXlsxSheetData } from '@/lib/export-services'
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

  it.each(['=cmd', '+cmd', '-cmd', '@cmd'])(
    "数式として解釈されうる値 %s の先頭に'を付けてテキスト強制する（CSVインジェクション対策）",
    (dangerous) => {
      const csv = toCsv([{ ...sample[0]!, subject: dangerous }])
      const lines = csv.split('\r\n')
      expect(lines[1]).toContain(`'${dangerous}`)
    },
  )

  it('数式文字を先頭に含む値でも、ダブルクォートを含む場合は引用符エスケープと両立する', () => {
    const csv = toCsv([{ ...sample[0]!, subject: '=HYPERLINK("http://evil.example")' }])
    const lines = csv.split('\r\n')
    expect(lines[1]).toContain('"\'=HYPERLINK(""http://evil.example"")"')
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

  it('セル内の|をエスケープし、改行を除去してテーブル構造の破壊を防ぐ', () => {
    const md = toMarkdown([
      { ...sample[0]!, subject: '偽の行 | [釣り](http://evil.example)\n改行' },
    ])
    // 元の生の "|"（エスケープ無し）が残っていないこと、"\|" に置き換わっていることを確認する
    expect(md).not.toContain('偽の行 | [')
    expect(md).toContain('偽の行 \\| [釣り](http://evil.example) 改行')
    // toMarkdown()自体は3行（ヘッダー・区切り・データ1行）しか生成しないため、
    // セル内改行が実際の行分割を増やしていないことも確認する
    expect(md.split('\n')).toHaveLength(3)
  })
})

describe('toXlsxSheetData', () => {
  it('ヘッダー行（太字）とデータ行を生成する', () => {
    const sheet = toXlsxSheetData(sample)
    expect(sheet).toHaveLength(2)
    expect(sheet[0]).toEqual([
      { value: 'サービス名', type: String, fontWeight: 'bold' },
      { value: '送信元ドメイン', type: String, fontWeight: 'bold' },
      { value: 'アクセスURL', type: String, fontWeight: 'bold' },
      { value: '件名', type: String, fontWeight: 'bold' },
      { value: '受信日', type: String, fontWeight: 'bold' },
    ])
    expect(sheet[1]).toEqual([
      { value: 'Example', type: String },
      { value: 'example.com', type: String },
      { value: 'https://example.com', type: String },
      { value: 'ようこそ', type: String },
      { value: '2026-08-15', type: String },
    ])
  })

  it.each(['=cmd', '+cmd', '-cmd', '@cmd'])(
    "数式として解釈されうる値 %s の先頭に'を付けてテキスト強制する（多層防御）",
    (dangerous) => {
      const sheet = toXlsxSheetData([{ ...sample[0]!, subject: dangerous }])
      expect(sheet[1]?.[3]).toEqual({ value: `'${dangerous}`, type: String })
    },
  )
})
