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
      '.claude/**',
      'node_modules/**',
      'test-results/**',
      'public/**',
      'battleiq/**', // legacy standalone JS prototype — out of scope
      'scripts/voicegen/.venv-tts/**',
      'scripts/dev/**', // throwaway debug/inspection scripts — not production code
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

      // ── Mechanized CLAUDE.md gotchas (errors) ──
      // These encode hard rules from CLAUDE.md so violations fail lint instead of
      // relying on every contributor (human or agent) remembering them.
      'no-restricted-globals': [
        'error',
        {
          name: 'localStorage',
          message:
            'All persistence goes through src/game/settings.ts (the omega-save-v2 blob). No ad-hoc localStorage keys.',
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: 'MemberExpression[object.name="window"][property.name="localStorage"]',
          message:
            'All persistence goes through src/game/settings.ts (the omega-save-v2 blob). No ad-hoc localStorage keys.',
        },
        {
          selector: 'CallExpression[callee.property.name="text"][callee.object.property.name="add"]',
          message:
            'Raw add.text renders blurry. Use the scene label() helper (applies resolution + default font).',
        },
        {
          selector: 'CallExpression[callee.property.name="setBounds"][callee.object.property.name="main"]',
          message:
            'Never set camera bounds — it reintroduces the black-bars framing bug. Confine the player with physics world bounds + perimeter walls (see CLAUDE.md).',
        },
      ],

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
      'no-restricted-globals': 'off', // tests reset localStorage directly
      'no-restricted-syntax': 'off',
    },
  },

  // e2e_tests/: the Playwright agent harness reads/writes the exact sanctioned
  // 'omega-save-v2' key directly (savestate/loadstate testing) rather than going
  // through settings.ts, since it's driving the game from Node, not shipped game
  // code — same rationale as the *.test.{ts,tsx} carve-out above.
  {
    files: ['e2e_tests/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'no-console': 'off',
      'no-restricted-globals': 'off',
      'no-restricted-syntax': 'off',
    },
  },

  // settings.ts IS the sanctioned persistence layer.
  {
    files: ['src/game/settings.ts'],
    rules: {
      'no-restricted-globals': 'off',
      'no-restricted-syntax': 'off',
    },
  },
);
