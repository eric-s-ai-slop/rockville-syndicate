import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e_tests',
  use: {
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run dev',
    port: 3324,
    reuseExistingServer: true,
  },
});
