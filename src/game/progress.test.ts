import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isChapterUnlocked, setFreePlay, loadProgress, markChapterComplete } from './progress';

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

describe('markChapterComplete', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('adds a chapter to empty progress and saves it', () => {
    const progress = markChapterComplete('chapter1');
    expect(progress.completedChapters).toEqual(['chapter1']);

    const saved = loadProgress();
    expect(saved.completedChapters).toEqual(['chapter1']);
  });

  it('adds a chapter to existing progress without overwriting', () => {
    markChapterComplete('chapter1');
    const progress = markChapterComplete('chapter2');
    expect(progress.completedChapters).toEqual(['chapter1', 'chapter2']);

    const saved = loadProgress();
    expect(saved.completedChapters).toEqual(['chapter1', 'chapter2']);
  });

  it('does not duplicate a chapter if already marked as complete', () => {
    markChapterComplete('chapter1');
    const progress = markChapterComplete('chapter1');
    expect(progress.completedChapters).toEqual(['chapter1']);

    const saved = loadProgress();
    expect(saved.completedChapters).toEqual(['chapter1']);
  });
});
