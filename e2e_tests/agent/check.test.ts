import { describe, expect, it } from 'vitest';
import { getExplicitFiles } from './check';

describe('agent check argument routing', () => {
  it('keeps the first changed file when no report arguments are present', () => {
    expect(getExplicitFiles(['server.ts'])).toEqual(['server.ts']);
  });

  it('removes report and transcript values while preserving changed files', () => {
    expect(getExplicitFiles([
      'src/game/ChapterScene.ts',
      '--report', 'qa/report.md',
      '--transcript', 'qa/session.jsonl',
    ])).toEqual(['src/game/ChapterScene.ts']);
  });

  it('does not treat the concurrency value as a changed file', () => {
    expect(getExplicitFiles([
      'e2e_tests/agent/check.ts',
      '--concurrency', '2',
    ])).toEqual(['e2e_tests/agent/check.ts']);
  });
});
