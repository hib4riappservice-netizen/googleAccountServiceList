// Gmail検索クエリ側で件名キーワードによる絞り込み済みのメッセージヘッダーを受け取り、
// 画面表示用のDTOに変換する純粋関数。本文は一切扱わない（ヘッダーのみ）。

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
