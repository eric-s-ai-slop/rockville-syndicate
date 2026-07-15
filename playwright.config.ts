import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e_tests',
  // Restrict to *.spec.ts (Playwright's default testMatch also picks up
  // *.test.ts). e2e_tests/ now also hosts plain Vitest unit tests for pure
  // helper modules (e.g. agent/playtestPolicy.test.ts) that use vitest's
  // describe/it directly — without this, Playwright's loader tries to import
  // them too and crashes at collection time (vitest's describe() throws when
  // invoked outside a vitest worker), breaking discovery for every real spec.
  testMatch: '**/*.spec.ts',
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
