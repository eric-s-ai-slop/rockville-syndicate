import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
    // e2e_tests/**/*.spec.ts are Playwright specs (run via `npm run e2e`), not
    // Vitest unit tests — keep those excluded. *.test.ts files under e2e_tests
    // (e.g. playtestPolicy.test.ts) are plain Vitest unit tests for pure
    // helper modules and should be picked up like any other *.test.ts file.
    // These two tests drive a live Vite server and run in the dedicated agent
    // integration stage. Keep the normal unit suite browser/server-free.
    exclude: [
      'e2e_tests/**/*.spec.ts',
      'e2e_tests/agent/cli.diagnostic.test.ts',
      'e2e_tests/agent/cli.protocol.test.ts',
      '.claude/**',
      'node_modules/**',
    ]
  },
  resolve: {
    alias: {
      // Allow testing assets with `?url`
      '\\?url$': '',
    }
  }
});
