import { defineConfig, devices } from '@playwright/test'

// TEST-01 (MUST): E2E は 20〜30本、全体で5分以内。クリティカルパスのみに絞る。
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // TEST-04 (SHOULD): CI のリトライは1回まで
  retries: process.env.CI ? 1 : 0,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'pnpm build && pnpm start',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
