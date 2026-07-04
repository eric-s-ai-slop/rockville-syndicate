import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';

// Drift guard: relative links in the living reference docs must point at files that
// exist. Stale pointers (e.g. a doc moved into docs/archive/) send agents down dead
// ends — this test catches the move in the same PR.
const ROOT = resolve(__dirname, '..');

const LIVING_DOCS = [
  'README.md',
  'CLAUDE.md',
  'ARCHITECTURE.md',
  'CONTRIBUTING.md',
  'ROADMAP.md',
  'docs/ADDING_A_MINIGAME.md',
  'docs/chapter-pipeline/working/README.md',
  'src/game/modes/CLAUDE.md',
  'src/data/chapters/CLAUDE.md',
];

const LINK_RE = /\]\(([^)]+)\)/g;

describe('living docs: relative links resolve', () => {
  for (const doc of LIVING_DOCS) {
    it(`${doc} has no dead relative links`, () => {
      const path = join(ROOT, doc);
      expect(existsSync(path), `${doc} is listed as a living doc but does not exist`).toBe(true);
      const text = readFileSync(path, 'utf-8');
      for (const match of text.matchAll(LINK_RE)) {
        const raw = match[1].trim();
        if (/^(https?:|mailto:|#)/.test(raw)) continue;
        const target = raw.split('#')[0];
        if (!target) continue;
        const resolved = target.startsWith('/')
          ? join(ROOT, target)
          : join(dirname(path), target);
        expect(existsSync(resolved), `${doc} links to missing file: ${raw}`).toBe(true);
      }
    });
  }
});
