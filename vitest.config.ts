import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
    exclude: ['e2e_tests/**', '.claude/**', 'node_modules/**']
  },
  resolve: {
    alias: {
      // Allow testing assets with `?url`
      '\\?url$': '',
    }
  }
});
