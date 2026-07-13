import { describe, it, expect, vi } from 'vitest';
import { isChapterUnlocked, setFreePlay, loadProgress, rememberHero, markChapterComplete, setRoseSilence, resetProgress } from './progress';

vi.mock('../data/chapters', () => ({
  CHAPTERS: [
    { id: 'chapter1' },
    { id: 'chapter2' },
    { id: 'chapter3' }
  ]
}));

describe('loadProgress', () => {
  it('returns fallback empty state when localStorage.getItem throws', async () => {
    const spy = vi.spyOn(window.localStorage, 'getItem').mockImplementation(() => {
      throw new Error('Access denied');
    });

    vi.resetModules();
    const { loadProgress: dynamicLoadProgress } = await import('./progress');
    const progress = dynamicLoadProgress();

    expect(progress.completedChapters).toEqual([]);

    spy.mockRestore();
  });
});

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

  it('uses false as default for freePlay', () => {
    expect(isChapterUnlocked('chapter2', [])).toBe(false);
    expect(isChapterUnlocked('chapter3', ['chapter1'])).toBe(false);
    expect(isChapterUnlocked('chapter2', ['chapter1'])).toBe(true);
  });
});

describe('markChapterComplete', () => {
  it('adds a chapter to completedChapters if it is not already there', () => {
    resetProgress(); // start fresh
    markChapterComplete('chapter1');
    const saved = loadProgress();
    expect(saved.completedChapters).toContain('chapter1');
  });

  it('does not duplicate a chapter if it is already in completedChapters', () => {
    resetProgress();
    markChapterComplete('chapter1');
    markChapterComplete('chapter1');
    const saved = loadProgress();
    expect(saved.completedChapters.filter(c => c === 'chapter1').length).toBe(1);
  });
});

describe('setRoseSilence', () => {
  it('sets the rose_silence flag to true', () => {
    setRoseSilence();
    const saved = loadProgress();
    expect(saved.rose_silence).toBe(true);
  });
});

describe('resetProgress', () => {
  it('clears completedChapters and wipes other progress fields to defaults', () => {
    markChapterComplete('chapter1');
    rememberHero('eric');
    setFreePlay(true);
    setRoseSilence();

    resetProgress();

    const saved = loadProgress();
    expect(saved.completedChapters).toEqual([]);
    expect(saved.hero).toBeUndefined();
    expect(saved.freePlay).toBe(false);
    expect(saved.rose_silence).toBe(false);
  });
});

describe('rememberHero', () => {
  it('saves the new hero ID when none was set previously', () => {
    rememberHero('eric');
    const saved = loadProgress();
    expect(saved.hero).toBe('eric');
  });

  it('updates the hero ID when one was already set', () => {
    rememberHero('lucy');
    const saved = loadProgress();
    expect(saved.hero).toBe('lucy');

    rememberHero('ethan');
    const updated = loadProgress();
    expect(updated.hero).toBe('ethan');
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
