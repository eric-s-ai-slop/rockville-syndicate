import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isChapterUnlocked, setFreePlay, loadProgress } from './progress';

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

describe('loadProgress', () => {
  let getItemSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    getItemSpy = vi.spyOn(localStorage, 'getItem');
  });

  afterEach(() => {
    getItemSpy.mockRestore();
  });

  it('returns default progress if localStorage is empty (null)', () => {
    getItemSpy.mockReturnValue(null);
    expect(loadProgress()).toEqual({ completedChapters: [] });
  });

  it('returns parsed progress if localStorage contains valid JSON', () => {
    const validJson = JSON.stringify({ completedChapters: ['chapter1'], hero: 'eric', freePlay: true });
    getItemSpy.mockReturnValue(validJson);
    expect(loadProgress()).toEqual({ completedChapters: ['chapter1'], hero: 'eric', freePlay: true });
  });

  it('handles invalid JSON by returning default progress', () => {
    getItemSpy.mockReturnValue('{invalid-json}');
    expect(loadProgress()).toEqual({ completedChapters: [] });
  });

  it('handles valid JSON with invalid field types gracefully', () => {
    const invalidFieldsJson = JSON.stringify({ completedChapters: 'not-an-array', hero: 123, freePlay: 'yes' });
    getItemSpy.mockReturnValue(invalidFieldsJson);
    expect(loadProgress()).toEqual({ completedChapters: [], hero: undefined, freePlay: false });
  });
});
