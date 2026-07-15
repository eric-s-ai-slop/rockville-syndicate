import { defineConfig } from 'vitest/config';

/** Live-server-only agent protocol tests; intentionally separate from unit Vitest. */
export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
    include: ['e2e_tests/agent/cli.diagnostic.test.ts', 'e2e_tests/agent/cli.protocol.test.ts'],
    exclude: ['e2e_tests/**/*.spec.ts', '.claude/**', 'node_modules/**'],
  },
});
