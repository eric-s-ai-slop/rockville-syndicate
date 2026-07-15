import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { loadContextMap } from '../e2e_tests/agent/context-map-data';
import { listRegisteredChapters, listRegisteredModes, resolveChapter, resolveMode } from '../e2e_tests/agent/context-map-resolution';
import { CHAPTERS } from './data/chapters';
import { listModeIds } from './game/modes';

const contextMap = loadContextMap();

// Drift guard for D5's curated context map: every file it points at must
// still exist, and every symbol it names must still appear (as an export) in
// its registration file — so a rename/move during a refactor fails CI instead
// of silently leaving agent:map pointing at nothing.
describe('context-map.json', () => {
  const map = loadContextMap();

  for (const [target, entry] of Object.entries(map)) {
    describe(target, () => {
      it('registrationFile exists', () => {
        expect(fs.existsSync(path.resolve(entry.registrationFile)), entry.registrationFile).toBe(true);
      });

      it('registrationSymbol is exported from registrationFile', () => {
        const content = fs.readFileSync(path.resolve(entry.registrationFile), 'utf8');
        const found =
          content.includes(`export const ${entry.registrationSymbol}`) ||
          content.includes(`export function ${entry.registrationSymbol}`) ||
          content.includes(entry.registrationSymbol); // e.g. `registerMode` used as a call, not a declaration
        expect(found, `"${entry.registrationSymbol}" not found in ${entry.registrationFile}`).toBe(true);
      });

      for (const relatedFile of entry.relatedFiles) {
        it(`relatedFile exists: ${relatedFile}`, () => {
          expect(fs.existsSync(path.resolve(relatedFile)), relatedFile).toBe(true);
        });
      }

      for (const symbol of entry.relatedSymbols) {
        it(`relatedSymbol "${symbol}" appears somewhere in relatedFiles`, () => {
          const found = entry.relatedFiles.some((f) => fs.readFileSync(path.resolve(f), 'utf8').includes(symbol));
          expect(found, `"${symbol}" not found in any of ${entry.relatedFiles.join(', ')}`).toBe(true);
        });
      }

      it('provides at least one verification command', () => {
        expect(entry.verificationCommands.length).toBeGreaterThan(0);
        for (const command of entry.verificationCommands) {
          expect(command.trim()).not.toBe('');
        }
      });
    });
  }
});

describe('registry-backed context resolution', () => {
  it('discovers every registered chapter without a per-chapter map', () => {
    expect(listRegisteredChapters(process.cwd())).toEqual(CHAPTERS.map(chapter => chapter.id));
  });

  it('discovers every registered mode without a per-mode map', () => {
    expect(listRegisteredModes(process.cwd())).toEqual(listModeIds().filter(id => !id.startsWith('test-mode-')));
  });

  it('resolves an exact chapter and its referenced modes', () => {
    const result = resolveChapter(process.cwd(), contextMap.chapter, 'origins', true);
    expect(result.sourceFile).toBe('src/data/chapters/chapter12.origins.ts');
    expect(result.referencedModeIds).toContain('doubleCall');
    expect(result.relatedFiles).toContain('src/game/assets/chapter/index.ts');
    expect(result.symbolRanges.some(range => range.symbol === 'Beat' && range.startLine > 0)).toBe(true);
  }, 30_000);

  it('resolves an exact mode and its local tests', () => {
    const result = resolveMode(process.cwd(), contextMap.mode, 'groupChat', true);
    expect(result.sourceFile).toBe('src/game/modes/groupChat/index.ts');
    expect(result.relatedFiles).toContain('src/game/modes/groupChat/parser.test.ts');
    expect(result.relatedFiles).toContain('src/contracts/mode-configs.ts');
    expect(result.verificationCommands[0]).toContain('groupChat/index.ts');
    expect(result.symbolRanges.some(range => range.symbol === 'GameMode' && range.endLine >= range.startLine)).toBe(true);
    expect(result.symbolRanges.some(range => range.symbol === 'ModeConfigMap')).toBe(true);
  });

  it('keeps the default context response compact and AST-free', () => {
    const chapter = resolveChapter(process.cwd(), contextMap.chapter, 'origins');
    const mode = resolveMode(process.cwd(), contextMap.mode, 'groupChat');
    expect('symbolRanges' in chapter).toBe(false);
    expect('symbolRanges' in mode).toBe(false);
    expect(JSON.stringify(chapter).length).toBeLessThan(2500);
    expect(JSON.stringify(mode).length).toBeLessThan(2500);
  });

  it('fails unknown registry IDs explicitly', () => {
    expect(() => resolveChapter(process.cwd(), contextMap.chapter, 'missing-chapter')).toThrow(/Valid IDs:/);
    expect(() => resolveMode(process.cwd(), contextMap.mode, 'missing-mode')).toThrow(/Valid IDs:/);
  });
});
