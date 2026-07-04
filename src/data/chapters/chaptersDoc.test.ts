import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CHAPTERS } from './index';

// Drift guards for the chapter-authoring cheat sheet (CLAUDE.md in this directory),
// mirroring modesDoc.test.ts. Agents lean on the doc tables instead of re-reading
// types.ts — these tests force the doc to move in the same PR as the code.
describe('chapters CLAUDE.md reference doc', () => {
  const dir = __dirname;
  const doc = readFileSync(join(dir, 'CLAUDE.md'), 'utf-8');

  it('mentions every Beat type in the union', () => {
    // The Beat union is erased at runtime, so extract the literals from types.ts text.
    const source = readFileSync(join(dir, 'types.ts'), 'utf-8');
    const beatTypes = [...source.matchAll(/\{ type: '([a-zA-Z]+)'/g)].map(m => m[1]);
    expect(beatTypes.length).toBeGreaterThan(10); // sanity: the extraction still works
    for (const t of new Set(beatTypes)) {
      expect(doc, `beat type '${t}' exists in types.ts but is missing from chapters CLAUDE.md`).toContain(`\`${t}\``);
    }
  });

  it('root README chapter table mentions every registered chapter config file', () => {
    const readme = readFileSync(join(dir, '../../../README.md'), 'utf-8');
    expect(CHAPTERS.length).toBeGreaterThan(10);
    for (const ch of CHAPTERS) {
      expect(readme, `chapter '${ch.id}' is registered but its title '${ch.title}' is missing from README.md`).toContain(ch.title);
    }
  });
});
