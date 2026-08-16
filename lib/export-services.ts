import type { SheetData } from 'write-excel-file/browser'
import type { DetectedService } from '@/lib/detect-services'

const HEADERS = ['サービス名', '件名', '受信日時', '送信元ドメイン', 'アクセスURL'] as const

// CSVインジェクション対策（CWE-1236）: name/subjectはメール送信者が自由に設定できる値。
// セルが =/+/-/@ で始まると表計算ソフトが数式として評価しうるため、先頭に ' を付けてテキスト強制する。
// xlsxは各セルに明示的な型（type: String）を持たせるためCSVほどの実害は無いはずだが、
// 「メール送信者が自由に書ける値をそのまま表計算ソフトに渡す」という構造は同じなので、
// 多層防御として同じ処理をxlsx側にも適用する。
export function neutralizeFormula(value: string): string {
  return /^[=+\-@]/.test(value) ? `'${value}` : value
}

// メールヘッダーのDateは送信側のタイムゾーンのまま（実例: -0700, +0000, +0900 (JST) が混在）
// なので、表示は常にAsia/Tokyoに揃える。パース失敗時は元の値をそのまま返す（安全側）。
export function formatReceivedAtJst(receivedAt: string): string {
  const date = new Date(receivedAt)
  if (Number.isNaN(date.getTime())) return receivedAt

  const formatter = new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  const parts = formatter.formatToParts(date)
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ''
  return `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')}`
}

function toRow(s: DetectedService): [string, string, string, string, string] {
  return [s.name, s.subject, formatReceivedAtJst(s.receivedAt), s.senderDomain, s.accessUrl]
}

// RFC 4180準拠の最小限のCSVエスケープ（カンマ・ダブルクォート・改行を含む場合のみ引用符で囲む）
function csvField(value: string): string {
  const safe = neutralizeFormula(value)
  if (/[",\n]/.test(safe)) {
    return `"${safe.replace(/"/g, '""')}"`
  }
  return safe
}

export function toCsv(services: DetectedService[]): string {
  const rows = services.map((s) => toRow(s).map(csvField).join(','))
  // ExcelでBOM無しCSVを開くと文字化けするため、呼び出し側でBOMを付与すること
  return [HEADERS.join(','), ...rows].join('\r\n')
}

// Markdownテーブルのセル内で構造を壊す文字（|、改行）をエスケープする。
// name/subjectは攻撃者（メール送信者）が自由に設定できる値のため、テーブル破壊・偽行の注入を防ぐ。
function markdownCell(value: string): string {
  return value.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ')
}

export function toMarkdown(services: DetectedService[]): string {
  const header = `| ${HEADERS.join(' | ')} |`
  const divider = `| ${HEADERS.map(() => '---').join(' | ')} |`
  const rows = services.map((s) => {
    const [name, subject, receivedAt, senderDomain] = toRow(s).map(markdownCell)
    return `| ${name} | ${subject} | ${receivedAt} | ${senderDomain} | [${s.accessUrl}](${s.accessUrl}) |`
  })
  return [header, divider, ...rows].join('\n')
}

// ドメイン部分がこの形（DNSホスト名として妥当な文字のみ）である場合に限り、Excelの
// HYPERLINK式でクリック可能なリンクにする。メール送信者が自由に書けるFromヘッダーから
// 抽出した値をそのまま数式文字列に埋め込むため、想定外の文字（"等）を含む場合は
// 数式化せず通常のテキストセルにフォールバックする（数式インジェクション対策）。
const SAFE_HOSTNAME = /^[a-z0-9.-]+$/
// DNSホスト名の最大長（RFC 1035）。異常に長い値を数式文字列に埋め込まないための保険。
const MAX_HOSTNAME_LENGTH = 253

function escapeExcelFormulaString(value: string): string {
  return value.replace(/"/g, '""')
}

type XlsxCell = { value: string; type: StringConstructor | 'Formula'; fontWeight?: 'bold' }

function accessUrlCell(s: DetectedService): XlsxCell {
  if (s.senderDomain.length <= MAX_HOSTNAME_LENGTH && SAFE_HOSTNAME.test(s.senderDomain)) {
    return { value: `=HYPERLINK("${escapeExcelFormulaString(s.accessUrl)}")`, type: 'Formula' }
  }
  return { value: neutralizeFormula(s.accessUrl), type: String }
}

export function toXlsxSheetData(services: DetectedService[]): SheetData {
  const headerRow = HEADERS.map((value) => ({ value, type: String, fontWeight: 'bold' as const }))
  const rows = services.map((s) => [
    { value: neutralizeFormula(s.name), type: String },
    { value: neutralizeFormula(s.subject), type: String },
    { value: neutralizeFormula(formatReceivedAtJst(s.receivedAt)), type: String },
    { value: neutralizeFormula(s.senderDomain), type: String },
    accessUrlCell(s),
  ])
  return [headerRow, ...rows]
}
