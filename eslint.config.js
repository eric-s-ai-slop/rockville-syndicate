// Flat ESLint config (ESLint 9 + typescript-eslint 8). Minimal, high-signal ruleset —
// the goal is to catch real bugs and keep the console clean for a parallel team, not to
// relitigate the whole 17k-LOC codebase. `any` is a warning, not an error, so it doesn't
// block the existing code while Track G4 chips away at it.
//
// Install (one-time): npm install
// Run: npm run lint:es   (autofix: npm run lint:fix)

import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default tseslint.config(
  {
    // Don't lint build output, deps, vendored/legacy code, or generated assets.
    ignores: [
      'dist/**',
      'node_modules/**',
      'db_data/**',
      'test-results/**',
      'public/**',
      'battleiq/**', // legacy standalone JS prototype — out of scope
      'scripts/voicegen/.venv-tts/**',
      // throwaway debug scripts at repo root (Track G2 will relocate/remove these)
      'debug_preprocess.*',
      'find_green.cjs',
      'inspect_colors.cjs',
      'inspect_sheet_columns.cjs',
      'bench_rows.ts',
      'eslint.config.js',
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,

      // ── Real-bug catchers (errors) ──
      '@typescript-eslint/no-floating-promises': 'off', // needs type-info; enable in a typed pass later
      'no-fallthrough': 'error',
      'no-self-assign': 'error',
      // The codebase intentionally uses `catch {}` for graceful silent asset-load fallbacks
      // (a documented convention) — allow that, but still flag other empty blocks.
      'no-empty': ['error', { allowEmptyCatch: true }],

      // ── Keep the console clean (Track E1/E3) ──
      // console.warn/error are the project's logging convention; ban only console.log.
      'no-console': ['warn', { allow: ['warn', 'error'] }],

      // ── Quality nudges (warnings — don't block the green bar) ──
      '@typescript-eslint/no-explicit-any': 'warn', // Track G4 drives this toward 0
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'prefer-const': 'warn',

      // ── Phaser/game ergonomics: too noisy to be useful here ──
      '@typescript-eslint/no-non-null-assertion': 'off', // Phaser input/keyboard access uses `!`
      '@typescript-eslint/ban-ts-comment': 'off',
    },
  },

  // Test + config files: relax a couple of rules.
  {
    files: ['**/*.test.{ts,tsx}', '**/*.config.{ts,js}', 'vitest.setup.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'no-console': 'off',
    },
  },
);
