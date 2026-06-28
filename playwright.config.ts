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
  // Run E2E against a production build, not the Vite dev server. The dev server
  // is unminified and double-invokes effects under <StrictMode>, which makes the
  // full-game playthrough specs run several times slower — slow enough to time
  // out on contended CI runners. The prod build runs fast enough to keep every
  // spec enabled on CI. server.ts serves dist/ statically when NODE_ENV=production.
  //
  // VITE_E2E=true exposes window.__OMEGA_GAME__ (the scene handle the specs drive)
  // in this build, which is otherwise dev-only and absent from production bundles.
  webServer: {
    command: 'VITE_E2E=true npm run build && NODE_ENV=production npm run start',
    port: 3324,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000, // cover the production build + server boot
  },
});
