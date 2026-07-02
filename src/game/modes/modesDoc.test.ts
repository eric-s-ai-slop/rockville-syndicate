import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { listModeIds } from './index';

// Drift guard: the mode reference table in src/game/modes/CLAUDE.md must cover
// every registered mode, so agents can trust it instead of re-exploring the registry.
describe('modes CLAUDE.md reference doc', () => {
  const doc = readFileSync(join(__dirname, 'CLAUDE.md'), 'utf-8');

  it('mentions every registered mode id', () => {
    for (const id of listModeIds()) {
      expect(doc, `mode '${id}' is registered but missing from src/game/modes/CLAUDE.md`).toContain(`\`${id}\``);
    }
  });
});
