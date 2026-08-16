// インメモリの簡易レート制限。DBを持たないため永続化しない — サーバー再起動や
// 複数インスタンス構成では上限がリセットされる/共有されないという既知の制約がある
// （docs/decisions.md参照）。SEC-40/41「高コストな操作に上限」の最小限の実装。
const buckets = new Map<string, { count: number; windowStart: number }>()

export function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const bucket = buckets.get(key)

  if (!bucket || now - bucket.windowStart >= windowMs) {
    buckets.set(key, { count: 1, windowStart: now })
    return true
  }

  if (bucket.count >= limit) {
    return false
  }

  bucket.count += 1
  return true
}
