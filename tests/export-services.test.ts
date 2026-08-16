import { describe, it, expect } from 'vitest'
import { toCsv, toMarkdown, toXlsxSheetData, formatReceivedAtJst } from '@/lib/export-services'
import type { DetectedService } from '@/lib/detect-services'

const sample: DetectedService[] = [
  {
    name: 'Example',
    senderDomain: 'example.com',
    accessUrl: 'https://example.com',
    subject: 'ようこそ',
    // UTC 12:34 → JST(+9h) 21:34、同日
    receivedAt: 'Sat, 15 Aug 2026 12:34:00 +0000',
  },
]

describe('formatReceivedAtJst', () => {
  it('タイムゾーンに関わらずAsia/Tokyoの日時に揃える', () => {
    expect(formatReceivedAtJst('Sat, 15 Aug 2026 12:34:00 +0000')).toBe('2026-08-15 21:34')
    // -0700（例: 米国太平洋時間）からの変換。UTC 12:59 → JST 21:59
    expect(formatReceivedAtJst('Wed, 12 Aug 2026 05:59:00 -0700')).toBe('2026-08-12 21:59')
  })

  it('日付をまたぐ変換も正しく行う', () => {
    // UTC 20:00 → JST(+9h) は翌日05:00
    expect(formatReceivedAtJst('Sat, 15 Aug 2026 20:00:00 +0000')).toBe('2026-08-16 05:00')
  })

  it('パースできない値は元の文字列をそのまま返す（安全側）', () => {
    expect(formatReceivedAtJst('not-a-date')).toBe('not-a-date')
  })
})

describe('toCsv', () => {
  it('ヘッダー行とデータ行をCRLF区切りで、サービス名・件名・受信日時・送信元ドメイン・アクセスURLの順で出力する', () => {
    const csv = toCsv(sample)
    const lines = csv.split('\r\n')
    expect(lines[0]).toBe('サービス名,件名,受信日時,送信元ドメイン,アクセスURL')
    expect(lines[1]).toBe('Example,ようこそ,2026-08-15 21:34,example.com,https://example.com')
  })

  it('カンマ・ダブルクォート・改行を含む値は引用符で囲みエスケープする', () => {
    const csv = toCsv([{ ...sample[0]!, name: '"Example", Inc.\n本社' }])
    expect(csv).toContain('"""Example"", Inc.\n本社"')
  })

  it('空配列の場合、ヘッダー行のみを返す', () => {
    expect(toCsv([]).split('\r\n')).toEqual(['サービス名,件名,受信日時,送信元ドメイン,アクセスURL'])
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
    expect(md).toContain('| サービス名 | 件名 | 受信日時 | 送信元ドメイン | アクセスURL |')
    expect(md).toContain('| --- | --- | --- | --- | --- |')
    expect(md).toContain(
      '| Example | ようこそ | 2026-08-15 21:34 | example.com | [https://example.com](https://example.com) |',
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
  it('ヘッダー行（太字）とデータ行を生成し、アクセスURLはHYPERLINK式にする', () => {
    const sheet = toXlsxSheetData(sample)
    expect(sheet).toHaveLength(2)
    expect(sheet[0]).toEqual([
      { value: 'サービス名', type: String, fontWeight: 'bold' },
      { value: '件名', type: String, fontWeight: 'bold' },
      { value: '受信日時', type: String, fontWeight: 'bold' },
      { value: '送信元ドメイン', type: String, fontWeight: 'bold' },
      { value: 'アクセスURL', type: String, fontWeight: 'bold' },
    ])
    expect(sheet[1]).toEqual([
      { value: 'Example', type: String },
      { value: 'ようこそ', type: String },
      { value: '2026-08-15 21:34', type: String },
      { value: 'example.com', type: String },
      { value: '=HYPERLINK("https://example.com")', type: 'Formula' },
    ])
  })

  it.each(['=cmd', '+cmd', '-cmd', '@cmd'])(
    "数式として解釈されうる値 %s の先頭に'を付けてテキスト強制する（多層防御）",
    (dangerous) => {
      const sheet = toXlsxSheetData([{ ...sample[0]!, subject: dangerous }])
      expect(sheet[1]?.[1]).toEqual({ value: `'${dangerous}`, type: String })
    },
  )

  it('送信元ドメインが異常に長い場合も、HYPERLINK式にせず通常のテキストにする（RFC 1035超過）', () => {
    const longDomain = 'a'.repeat(254) + '.com'
    const sheet = toXlsxSheetData([
      { ...sample[0]!, senderDomain: longDomain, accessUrl: `https://${longDomain}` },
    ])
    const cell = sheet[1]?.[4] as { value: string; type: unknown } | undefined
    expect(cell?.type).toBe(String)
  })

  it('送信元ドメインが妥当なホスト名の形でない場合、HYPERLINK式にせず通常のテキストにする（数式インジェクション対策）', () => {
    // メール送信者が自由に書けるFromヘッダーから抽出した値のため、"を含む等の異常系を想定する
    const dangerous: DetectedService = {
      ...sample[0]!,
      senderDomain: 'evil.com"),cmd|\'/c calc\'!A0)+HYPERLINK("',
      accessUrl: 'https://evil.com"),cmd|\'/c calc\'!A0)+HYPERLINK("',
    }
    const sheet = toXlsxSheetData([dangerous])
    const cell = sheet[1]?.[4] as { value: string; type: unknown } | undefined
    // type:'Formula'ではなくtype:Stringのままなら、Excelはこの文字列を式として一切評価しない
    expect(cell?.type).toBe(String)
    expect(cell?.value).toBe(dangerous.accessUrl)
  })
})
