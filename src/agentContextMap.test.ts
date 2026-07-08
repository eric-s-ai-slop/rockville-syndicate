import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { loadContextMap } from '../e2e_tests/agent/context-map-data';

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
    });
  }
});
