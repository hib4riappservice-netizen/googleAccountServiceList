import type { DetectedService } from '@/lib/detect-services'

const HEADERS = ['サービス名', '送信元ドメイン', 'アクセスURL', '件名', '受信日'] as const

// CSVインジェクション対策（CWE-1236）: name/subjectはメール送信者が自由に設定できる値。
// セルが =/+/-/@ で始まると表計算ソフトが数式として評価しうるため、先頭に ' を付けてテキスト強制する。
function neutralizeFormula(value: string): string {
  return /^[=+\-@]/.test(value) ? `'${value}` : value
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
  const rows = services.map((s) =>
    [s.name, s.senderDomain, s.accessUrl, s.subject, s.receivedAt].map(csvField).join(','),
  )
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
    const name = markdownCell(s.name)
    const senderDomain = markdownCell(s.senderDomain)
    const subject = markdownCell(s.subject)
    const receivedAt = markdownCell(s.receivedAt)
    return `| ${name} | ${senderDomain} | [${s.accessUrl}](${s.accessUrl}) | ${subject} | ${receivedAt} |`
  })
  return [header, divider, ...rows].join('\n')
}
