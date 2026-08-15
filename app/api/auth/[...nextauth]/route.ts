import { handlers } from '@/auth'

// 権限が強いファイル (rules/20-security.md 自己レビュー手順)。ロジックを足さない。
export const { GET, POST } = handlers
