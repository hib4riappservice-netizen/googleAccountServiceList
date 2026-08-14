import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(dirname, '.'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    // tests/e2e は Playwright の管轄。Vitest には含めない (TEST-01: 層を混在させない)
    exclude: ['node_modules/**', '.next/**', 'tests/e2e/**'],
    // TEST-03 (MUST): 時刻・乱数・外部APIを固定する。個々のテストで fakeTimers / モックを使う。
  },
})
