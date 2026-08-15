import '@testing-library/jest-dom/vitest'
import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

// `server-only` はNext.jsのバンドラーが react-server exports条件で解決する専用パッケージで、
// それ以外の環境（Vitest/jsdom）からimportすると意図的に例外を投げる。
// data/ 配下のDAL関数を単体テストする際に毎回踏むため、ここで一括して無害化する。
vi.mock('server-only', () => ({}))

// @testing-library/reactの自動cleanupは `globals: true`（グローバルなafterEach）に依存するが、
// vitest.config.tsではglobalsを有効化していないため自動検出されない。明示的に呼ぶ。
// （テストごとにDOMがリセットされないと、同一ロールの要素が複数テストにまたがって残り、
// getByRole等が「複数要素が見つかった」で失敗する）
afterEach(() => {
  cleanup()
})
