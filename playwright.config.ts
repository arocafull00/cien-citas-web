import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests/browser', fullyParallel: false, workers: 1,
  use: { baseURL: 'http://localhost:3002', trace: 'retain-on-failure', ...devices['Pixel 7'], channel: 'chrome' },
  webServer: { command: 'pnpm start', url: 'http://localhost:3002/offline', reuseExistingServer: !process.env.CI, timeout: 60000 },
  reporter: [['list']],
});
