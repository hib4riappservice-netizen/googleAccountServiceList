import 'server-only'
import { headers as nextHeaders } from 'next/headers'
import { getToken } from 'next-auth/jwt'
import {
  detectRegisteredServices,
  type DetectedService,
  type GmailMessageHeader,
} from '@/lib/detect-services'
import { checkRateLimit } from '@/lib/rate-limit'

// SEC-40/41: 高コストな外部API呼び出しの上限。DBが無くサーバー側の永続的なレート制限は
// 持てないため、1回あたりの取得件数を絞ることで上限を設ける（Gmail API自体のクォータにも守られる）。
// 件名での事前絞り込みをやめた分（下記）、対象母数が広がったため件数も引き上げる。
const MAX_RESULTS = 200
// 連打防止（SEC-40/41）。lib/rate-limit.tsの制約（インメモリ、再起動でリセット）は許容する。
const SCAN_RATE_LIMIT = 5
const SCAN_RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000
// 件名キーワード（"welcome"等）での絞り込みは、実際の登録通知メールの件名パターンが
// 多様すぎて取りこぼしが多いと判明したため廃止した（CEOからの指摘）。件名では絞らず、
// 送受信・下書き・迷惑メールを含む全メール（ゴミ箱を除く）を対象にする。Gmail検索は
// 既定でSpam/Trashを除外するため、in:anywhereで両方の除外を解除した上で-in:trashにより
// ゴミ箱だけ除外し直す。ノイズ（個人からの連絡等）はlib/detect-services.tsのドメイン除外で抑える。
const SEARCH_QUERY = 'in:anywhere -in:trash'
// MAX_RESULTS引き上げに伴い、個別メッセージ取得を一括Promise.allで撃つとGmail APIの
// per-user quota（約250 unit/秒、messages.getは5 unit）に対してバースト的になりうる
// （レビューで指摘）。小さいバッチに分けて逐次実行することで平準化する。
const FETCH_CONCURRENCY = 10

export type ScanResult =
  | { status: 'unauthorized' }
  | { status: 'rate_limited' }
  | { status: 'error'; errorId: string }
  | { status: 'success'; services: DetectedService[] }

// SEC-05は該当なし: /users/me/ のみを呼び、呼び出し元以外のIDを一切受け取らないため
// IDORの攻撃面が無い（docs/specs/gmail-scan.md参照）。他ユーザーのリソースIDを扱う経路を
// 足す場合はこの判断を見直すこと。
export async function scanRegisteredServices(): Promise<ScanResult> {
  try {
    // secretを明示的に渡さないと、サインイン済み（セッションCookieあり）の場合に
    // getToken()がMissingSecretを投げる（実測で発見。next-auth本体のNextAuth()呼び出しは
    // 内部でAUTH_SECRETを自動解決するが、getToken()単体では解決しない）
    const secret = process.env.AUTH_SECRET
    if (!secret) throw new Error('AUTH_SECRET is not set')
    const token = await getToken({ req: { headers: await nextHeaders() }, secret })
    if (!token?.accessToken || !token.sub) {
      return { status: 'unauthorized' }
    }
    if (!checkRateLimit(token.sub, SCAN_RATE_LIMIT, SCAN_RATE_LIMIT_WINDOW_MS)) {
      return { status: 'rate_limited' }
    }

    const messageIds = await listMessageIds(token.accessToken)
    const found = await fetchMessageHeadersInBatches(messageIds, token.accessToken)
    return { status: 'success', services: detectRegisteredServices(found) }
  } catch (error) {
    // SEC-81: 握りつぶさずログに残す（トークン等の秘密は含まれない想定のerrorのみ）。
    // ERR-01: 想定外エラーは内部情報を出さず、ログと突き合わせられるIDだけを画面に返す。
    const errorId = crypto.randomUUID()
    console.error('[data/gmail] scanRegisteredServices failed', { errorId, error })
    return { status: 'error', errorId }
  }
}

async function listMessageIds(accessToken: string): Promise<string[]> {
  const url = new URL('https://gmail.googleapis.com/gmail/v1/users/me/messages')
  url.searchParams.set('maxResults', String(MAX_RESULTS))
  url.searchParams.set('q', SEARCH_QUERY)

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(10_000), // SEC-82: 外部API呼び出しにタイムアウト
  })
  if (!res.ok) throw new Error(`Gmail list failed: ${res.status}`)

  const data: unknown = await res.json()
  if (typeof data !== 'object' || data === null || !('messages' in data)) return []
  const { messages } = data as { messages?: unknown }
  if (!Array.isArray(messages)) return []

  return messages
    .map((m) =>
      typeof m === 'object' && m !== null && 'id' in m ? (m as { id: unknown }).id : null,
    )
    .filter((id): id is string => typeof id === 'string')
}

// 一括Promise.allでの取得はGmail APIのper-userクォータに対してバースト的になりうるため、
// FETCH_CONCURRENCY件ずつ順番に取得する（1バッチ内はPromise.allで並列化する）。
async function fetchMessageHeadersInBatches(
  ids: string[],
  accessToken: string,
): Promise<GmailMessageHeader[]> {
  const found: GmailMessageHeader[] = []
  for (let i = 0; i < ids.length; i += FETCH_CONCURRENCY) {
    const batch = ids.slice(i, i + FETCH_CONCURRENCY)
    const results = await Promise.all(batch.map((id) => fetchMessageHeader(id, accessToken)))
    for (const result of results) {
      if (result) found.push(result)
    }
  }
  return found
}

async function fetchMessageHeader(
  id: string,
  accessToken: string,
): Promise<GmailMessageHeader | null> {
  const url = new URL(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}`)
  url.searchParams.set('format', 'metadata')
  url.searchParams.append('metadataHeaders', 'From')
  url.searchParams.append('metadataHeaders', 'Subject')
  url.searchParams.append('metadataHeaders', 'Date')

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(10_000),
  })
  if (!res.ok) return null

  const data: unknown = await res.json()
  if (typeof data !== 'object' || data === null || !('payload' in data)) return null
  const payload = (data as { payload?: unknown }).payload
  if (typeof payload !== 'object' || payload === null || !('headers' in payload)) return null
  const rawHeaders = (payload as { headers?: unknown }).headers
  if (!Array.isArray(rawHeaders)) return null

  const get = (name: string): string => {
    const entry = rawHeaders.find(
      (h): h is { name: string; value: string } =>
        typeof h === 'object' &&
        h !== null &&
        'name' in h &&
        (h as { name: unknown }).name === name,
    )
    return entry?.value ?? ''
  }

  const from = get('From')
  if (!from) return null

  return { id, subject: get('Subject'), from, receivedAt: get('Date') }
}
