// Gmail側では件名で絞り込まず（実測で取りこぼしが多いと判明したため廃止）、
// 迷惑メールを含む全メールを対象にする。そのため個人からの連絡がそのまま
// 「登録済みサービス」として混入しないよう、ここでノイズを落とす。本文は一切扱わない（ヘッダーのみ）。

// 個人向けフリーメールのドメイン。これらのドメインからの送信は個人からの連絡である
// 可能性が高く、「登録したサービス」ではないため一覧から除外する
// （件名キーワードでの事前絞り込みをやめたことに伴うノイズ対策。CEOからの指摘で追加）。
const PERSONAL_EMAIL_DOMAINS = new Set([
  'gmail.com',
  'googlemail.com',
  'yahoo.co.jp',
  'yahoo.com',
  'outlook.com',
  'outlook.jp',
  'hotmail.com',
  'hotmail.co.jp',
  'live.com',
  'live.jp',
  'icloud.com',
  'me.com',
  'docomo.ne.jp',
  'ezweb.ne.jp',
  'au.com',
  'softbank.ne.jp',
  'i.softbank.jp',
])

export type GmailMessageHeader = {
  id: string
  subject: string
  from: string
  receivedAt: string
}

export type DetectedService = {
  name: string
  senderDomain: string
  accessUrl: string
  subject: string
  receivedAt: string
}

export function detectRegisteredServices(messages: GmailMessageHeader[]): DetectedService[] {
  const byDomain = new Map<string, DetectedService>()

  for (const message of messages) {
    const parsed = parseFromHeader(message.from)
    if (!parsed) continue
    if (PERSONAL_EMAIL_DOMAINS.has(parsed.domain)) continue
    if (byDomain.has(parsed.domain)) continue

    byDomain.set(parsed.domain, {
      name: parsed.name ?? parsed.domain,
      senderDomain: parsed.domain,
      // ドメインから推測した参考リンク。実際のログインURLとは限らない（トップページへの誘導）
      accessUrl: `https://${parsed.domain}`,
      subject: message.subject,
      receivedAt: message.receivedAt,
    })
  }

  return [...byDomain.values()]
}

function parseFromHeader(from: string): { name: string | null; domain: string } | null {
  // "表示名 <email@domain>" 形式と、素の "email@domain" 形式の両方に対応する
  const bracketMatch = from.match(/^(.*)<([^<>\s]+)>\s*$/)
  const email = (bracketMatch?.[2] ?? from).trim()
  // RFC 5322のquoted-string: 前後の"を外し、\"のようなバックスラッシュエスケープを解く
  // （実例: `"\"お名前.com\""` は表示名に " を含めたいサービスからの実際のFromヘッダー）
  const rawName = (bracketMatch?.[1] ?? '').trim().replace(/^"|"$/g, '').replace(/\\(.)/g, '$1')

  const at = email.lastIndexOf('@')
  if (at <= 0 || at === email.length - 1) return null
  const domain = email.slice(at + 1).toLowerCase()
  if (!domain) return null

  return { name: rawName ? rawName : null, domain }
}
