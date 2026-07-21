import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, basename } from 'node:path';
import { ALL_CHAPTERS, CHAPTERS } from './index';

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

  it('root README chapter catalog matches canonical chapter metadata field by field', () => {
    const readme = readFileSync(join(dir, '../../../README.md'), 'utf-8');
    expect(CHAPTERS.length).toBeGreaterThan(10);
    const rows = readme
      .split('\n')
      .filter(line => /^\| \d+ \|/.test(line))
      .map(line => line.split('|').slice(1, -1).map(cell => cell.trim()));
    expect(rows.length, 'README chapter catalog row count').toBe(ALL_CHAPTERS.length);

    const registry = readFileSync(join(dir, 'index.ts'), 'utf-8');
    const imports = [...registry.matchAll(/^import\s+\w+\s+from\s+['"](\.[^'"]+)['"];?/gm)]
      .map(match => match[1]);
    const sourceFileFor = (id: string): string => {
      const source = imports.find(specifier => {
        const file = join(dir, `${specifier}.ts`);
        return readFileSync(file, 'utf-8').includes(`id: '${id}'`);
      });
      if (!source) throw new Error(`No chapter source file found for ${id}`);
      return basename(`${source}.ts`);
    };

    ALL_CHAPTERS.forEach((chapter, index) => {
      const estimate = chapter.estimatedMinutes!;
      const expected = [
        String(index + 1),
        `\`${chapter.id}\``,
        chapter.title,
        chapter.kind,
        chapter.location,
        `${estimate.min}–${estimate.max} min`,
        chapter.deployment,
        chapter.seal ?? (chapter.classified ? 'classified' : '—'),
        `\`${sourceFileFor(chapter.id)}\``,
      ];
      const actual = rows[index];
      expected.forEach((value, fieldIndex) => {
        expect(actual?.[fieldIndex], `README chapter ${chapter.id} field ${fieldIndex + 1}`).toBe(value);
      });
    });
  });

  it('keeps the development fixture out of the production-facing catalog', () => {
    const readme = readFileSync(join(dir, '../../../README.md'), 'utf-8');
    expect(readme).toContain('| 15 | `fixture-playtest` | Playtest Fixture | chapter | Rockville Park (synthetic) | 5–8 min | development | — | `chapterFixture.playtest.ts` |');
    expect(readme).toContain('| 16 | `origins` | Rockville Syndicate: Origins | chapter | Rockville, MD — summer 2024 → tonight | 16–22 min | shipping | external | `chapter12.origins.ts` |');
    expect(readme).not.toContain('fixture-playtest` | Playtest Fixture | chapter | Rockville Park (synthetic) | 5–8 min | shipping');
  });
});
