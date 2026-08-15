import 'server-only'
import { cache } from 'react'
import { auth } from '@/auth'

export type CurrentUser = {
  id: string
  name: string | null
  email: string | null
  image: string | null
}

// Next.jsの静的生成中の動的API検知シグナル。実際の失敗ではないため伝播させる（decisions.md参照）
function isNextDynamicUsageSignal(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'digest' in error &&
    typeof error.digest === 'string' &&
    error.digest.startsWith('DYNAMIC_SERVER_USAGE')
  )
}

// 認証（誰か）＝セッションの読み取りのみ。このDALが扱うリソースは無いため、
// 認可（所有権）の判定対象は今のところ存在しない（ARC-03の3は該当なし）。
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  try {
    const session = await auth()
    if (!session?.user?.id) return null

    return {
      id: session.user.id,
      name: session.user.name ?? null,
      email: session.user.email ?? null,
      image: session.user.image ?? null,
    }
  } catch (error) {
    if (isNextDynamicUsageSignal(error)) {
      throw error
    }
    // SEC-80: 判定に失敗したら安全側（未ログイン扱い）に倒す
    // SEC-81: 握りつぶさずログに残す（トークン等の秘密は含まれない想定のerrorのみ）
    console.error('[data/auth] getCurrentUser failed, treating as signed-out', error)
    return null
  }
})
