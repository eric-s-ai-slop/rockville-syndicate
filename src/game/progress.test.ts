import { describe, it, expect, vi } from 'vitest';
import { isChapterUnlocked, setFreePlay, loadProgress, saveProgress } from './progress';

vi.mock('../data/chapters', () => ({
  CHAPTERS: [
    { id: 'chapter1' },
    { id: 'chapter2' },
    { id: 'chapter3' }
  ]
}));

describe('isChapterUnlocked', () => {
  it('returns true if freePlay is true, regardless of completion', () => {
    expect(isChapterUnlocked('chapter3', [], true)).toBe(true);
    expect(isChapterUnlocked('chapter3', ['chapter1'], true)).toBe(true);
  });

  it('returns true if chapter is the first one, regardless of completion', () => {
    expect(isChapterUnlocked('chapter1', [], false)).toBe(true);
  });

  it('returns true if chapter is not found in the array', () => {
    expect(isChapterUnlocked('unknown', [], false)).toBe(true);
  });

  it('returns true if the previous chapter is in the completed array', () => {
    expect(isChapterUnlocked('chapter2', ['chapter1'], false)).toBe(true);
    expect(isChapterUnlocked('chapter3', ['chapter1', 'chapter2'], false)).toBe(true);
  });

  it('returns false if the previous chapter is NOT in the completed array', () => {
    expect(isChapterUnlocked('chapter2', [], false)).toBe(false);
    expect(isChapterUnlocked('chapter3', ['chapter1'], false)).toBe(false);
  });
});

describe('saveProgress', () => {
  it('silently ignores localStorage errors', () => {
    const spy = vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new Error('Quota exceeded');
    });
    expect(() => saveProgress({ completedChapters: [] })).not.toThrow();
    spy.mockRestore();
  });
});

describe('setFreePlay', () => {
  it('sets freePlay flag and saves', () => {
    const progress = setFreePlay(true);
    expect(progress.freePlay).toBe(true);

    const saved = loadProgress();
    expect(saved.freePlay).toBe(true);
  });

  it('updates freePlay', () => {
    setFreePlay(true);
    expect(loadProgress().freePlay).toBe(true);
    setFreePlay(false);
    expect(loadProgress().freePlay).toBe(false);
  });
});
