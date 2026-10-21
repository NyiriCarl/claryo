import { defineConfig, devices } from '@playwright/test'

// End-to-end tests run the real web app against the local API (demo AI,
// development sign-in). Requires Deno for the API: see docs/SETUP.md.
const API_PORT = 8799
const WEB_PORT = 5199
const deno = process.env.DENO_BIN || 'deno'
const executablePath = process.env.PW_CHROMIUM_PATH || undefined

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    trace: 'retain-on-failure',
    launchOptions: { executablePath },
  },
  projects: [
    { name: 'phone-390', use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true } },
    { name: 'android-360', use: { ...devices['Desktop Chrome'], viewport: { width: 360, height: 740 }, hasTouch: true, isMobile: true } },
  ],
  webServer: [
    {
      command: `rm -f .data/e2e-kv.json && ${deno} run -A server/dev.ts`,
      url: `http://localhost:${API_PORT}/make-server-b327929d/health`,
      env: { PORT: String(API_PORT), DEV_AUTH: 'true', DEV_DATA_FILE: '.data/e2e-kv.json', LIMIT_GUEST_PLANS_PER_DAY: '1000', LIMIT_USER_PLANS_PER_DAY: '1000' },
      reuseExistingServer: false,
    },
    {
      command: `npx vite --config vite.figma.config.ts`,
      url: `http://localhost:${WEB_PORT}`,
      env: {
        PORT: String(WEB_PORT),
        VITE_API_URL: `http://localhost:${API_PORT}/make-server-b327929d`,
        VITE_AUTH_PROVIDER: 'dev',
      },
      reuseExistingServer: false,
    },
  ],
})
