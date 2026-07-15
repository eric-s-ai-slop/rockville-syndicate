import { describe, expect, it } from 'vitest';
import { formatFailureOutput } from './check-output';

describe('formatFailureOutput', () => {
  it('caps each stage failure and reports omitted lines', () => {
    const output = Array.from({ length: 100 }, (_, index) => `line-${index}`).join('\n');
    const result = formatFailureOutput('typecheck', output);

    expect(result.text.split('\n')).toHaveLength(20);
    expect(result.text).toContain('line-99');
    expect(result.omittedLines).toBe(80);
    expect(result.totalLines).toBe(100);
  });

  it('preserves complete output in verbose mode', () => {
    const output = Array.from({ length: 40 }, (_, index) => `line-${index}`).join('\n');
    const result = formatFailureOutput('tests', output, true);

    expect(result.text.split('\n')).toHaveLength(40);
    expect(result.omittedLines).toBe(0);
  });
});
