import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e_tests',
  // These specs are full-game playthroughs that boot Phaser and walk through a
  // chapter against a single shared dev server; running them in parallel
  // overloads it and causes flaky timeouts. Run serially.
  workers: 1,
  use: {
    baseURL: 'http://localhost:3324',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run dev',
    port: 3324,
    reuseExistingServer: true,
  },
});
