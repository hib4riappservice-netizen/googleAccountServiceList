import type { DetectedService } from '@/lib/detect-services'

const HEADERS = ['サービス名', '送信元ドメイン', 'アクセスURL', '件名', '受信日'] as const

// RFC 4180準拠の最小限のCSVエスケープ（カンマ・ダブルクォート・改行を含む場合のみ引用符で囲む）
function csvField(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

export function toCsv(services: DetectedService[]): string {
  const rows = services.map((s) =>
    [s.name, s.senderDomain, s.accessUrl, s.subject, s.receivedAt].map(csvField).join(','),
  )
  // ExcelでBOM無しCSVを開くと文字化けするため、呼び出し側でBOMを付与すること
  return [HEADERS.join(','), ...rows].join('\r\n')
}

export function toMarkdown(services: DetectedService[]): string {
  const header = `| ${HEADERS.join(' | ')} |`
  const divider = `| ${HEADERS.map(() => '---').join(' | ')} |`
  const rows = services.map(
    (s) =>
      `| ${s.name} | ${s.senderDomain} | [${s.accessUrl}](${s.accessUrl}) | ${s.subject} | ${s.receivedAt} |`,
  )
  return [header, divider, ...rows].join('\n')
}
