import { describe, it, expect } from 'vitest';
import { parseArgs, formatSymbolInvestigation } from './agent-refs';
import { investigateSymbol } from './ast';

describe('agent-refs CLI argument parsing', () => {
  it('parses valid --symbol argument', () => {
    expect(parseArgs(['--symbol', 'ALL_CHAPTERS'])).toEqual({ symbolName: 'ALL_CHAPTERS' });
    expect(parseArgs(['--symbol=ALL_CHAPTERS'])).toEqual({ symbolName: 'ALL_CHAPTERS' });
  });

  it('rejects missing --symbol argument', () => {
    expect(() => parseArgs([])).toThrow(/missing required --symbol/i);
  });

  it('rejects empty --symbol argument', () => {
    expect(() => parseArgs(['--symbol', ''])).toThrow(/cannot be empty/i);
    expect(() => parseArgs(['--symbol='])).toThrow(/cannot be empty/i);
    expect(() => parseArgs(['--symbol'])).toThrow(/requires a non-empty symbol name/i);
  });

  it('rejects multiple --symbol arguments', () => {
    expect(() => parseArgs(['--symbol', 'A', '--symbol', 'B'])).toThrow(/multiple --symbol arguments/i);
  });

  it('rejects unrecognized extra arguments', () => {
    expect(() => parseArgs(['--symbol', 'A', 'extra'])).toThrow(/unrecognized argument/i);
    expect(() => parseArgs(['--foo'])).toThrow(/unrecognized argument/i);
  });
});

describe('AST symbol reference investigator (investigateSymbol)', () => {
  it('resolves ALL_CHAPTERS declaration and references correctly', () => {
    const result = investigateSymbol('ALL_CHAPTERS');
    expect(result.symbolName).toBe('ALL_CHAPTERS');
    expect(result.declarationFile).toBe('src/data/chapters/index.ts');
    expect(result.declarationLine).toBeGreaterThan(0);
    expect(result.declarationExcerpt).toContain('ALL_CHAPTERS');
    expect(result.references.length).toBeGreaterThan(0);

    // Ensure declaration line is excluded
    const declLineRef = result.references.find(
      (r) => r.file === result.declarationFile && r.line === result.declarationLine
    );
    expect(declLineRef).toBeUndefined();

    // Ensure all paths are POSIX repo-relative
    for (const r of result.references) {
      expect(r.file).not.toContain('\\');
      expect(r.file.startsWith('src/') || r.file.startsWith('e2e_tests/')).toBe(true);
      expect(r.line).toBeGreaterThan(0);
      expect(typeof r.lineText).toBe('string');
      expect(r.lineText).toContain('ALL_CHAPTERS');
    }

    // Ensure deterministic ordering (file ASC, then line ASC)
    for (let i = 1; i < result.references.length; i++) {
      const prev = result.references[i - 1];
      const curr = result.references[i];
      const comp = prev.file.localeCompare(curr.file);
      if (comp === 0) {
        expect(curr.line).toBeGreaterThan(prev.line);
      } else {
        expect(comp).toBeLessThan(0);
      }
    }
  }, 30000);

  it('throws a clear error for non-existent symbol', () => {
    expect(() => investigateSymbol('NON_EXISTENT_SYMBOL_XYZ_9999')).toThrow(/cannot be resolved/i);
  }, 30000);

  it('throws a clear error for ambiguous symbol', () => {
    expect(() => investigateSymbol('id')).toThrow(/ambiguous across \d+ unrelated declarations/i);
  }, 30000);

  it('formats symbol investigation output properly', () => {
    const mockResult = {
      symbolName: 'TEST_SYM',
      declarationFile: 'src/test.ts',
      declarationLine: 10,
      declarationExcerpt: 'const TEST_SYM = 42;',
      references: [
        { file: 'src/usage.ts', line: 15, lineText: 'console.log(TEST_SYM);' },
      ],
    };
    const formatted = formatSymbolInvestigation(mockResult);
    expect(formatted).toContain('Symbol: TEST_SYM');
    expect(formatted).toContain('Declaration: src/test.ts:10');
    expect(formatted).toContain('const TEST_SYM = 42;');
    expect(formatted).toContain('References (1):');
    expect(formatted).toContain('src/usage.ts:15: console.log(TEST_SYM);');
  });
});
