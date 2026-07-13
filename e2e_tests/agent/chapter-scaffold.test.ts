import { describe, expect, it } from 'vitest';
import { createChapterScaffold } from './chapter-scaffold';

describe('createChapterScaffold', () => {
  it('creates a small typed chapter file from an index and slug', () => {
    const result = createChapterScaffold(13, 'new-adventure');
    expect(result.fileName).toBe('chapter13.new-adventure.ts');
    expect(result.chapterId).toBe('new_adventure');
    expect(result.exportName).toBe('chapter13NewAdventure');
    expect(result.source).toContain("import type { ChapterConfig }");
    expect(result.source).toContain("title: 'New Adventure'");
    expect(result.source).toContain("{ type: 'endChapter' }");
  });

  it('rejects ambiguous inputs', () => {
    expect(() => createChapterScaffold(-1, 'valid-slug')).toThrow(/non-negative integer/);
    expect(() => createChapterScaffold(13, 'Not Valid')).toThrow(/kebab-case/);
  });
});
