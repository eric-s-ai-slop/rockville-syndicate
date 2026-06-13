import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadProgress, saveProgress, resetProgress, markChapterComplete, rememberHero, setFreePlay, isChapterUnlocked } from './progress';

const KEY = 'omega-progress-v1';

describe('progress', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('loadProgress', () => {
    it('returns default progress if nothing in localStorage', () => {
      const progress = loadProgress();
      expect(progress).toEqual({ completedChapters: [] });
    });

    it('returns parsed progress if valid JSON in localStorage', () => {
      localStorage.setItem(KEY, JSON.stringify({ completedChapters: ['chap1'], hero: 'hero1', freePlay: true }));
      const progress = loadProgress();
      expect(progress).toEqual({ completedChapters: ['chap1'], hero: 'hero1', freePlay: true });
    });

    it('returns default progress if malformed JSON in localStorage', () => {
      vi.spyOn(Storage.prototype, 'getItem').mockReturnValueOnce('{malformed_json:');
      const progress = loadProgress();
      expect(progress).toEqual({ completedChapters: [] });
    });

    it('handles partially malformed objects', () => {
      localStorage.setItem(KEY, JSON.stringify({ completedChapters: 'not-an-array', hero: 123, freePlay: 'yes' }));
      const progress = loadProgress();
      expect(progress).toEqual({ completedChapters: [], hero: undefined, freePlay: false });
    });
  });

  describe('saveProgress', () => {
    it('saves progress to localStorage', () => {
      saveProgress({ completedChapters: ['chap1'], hero: 'hero1', freePlay: true });
      expect(localStorage.getItem(KEY)).toBe(JSON.stringify({ completedChapters: ['chap1'], hero: 'hero1', freePlay: true }));
    });

    it('ignores errors when saving (e.g. quota exceeded)', () => {
      vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
        throw new Error('Quota exceeded');
      });
      // Should not throw
      expect(() => saveProgress({ completedChapters: ['chap1'] })).not.toThrow();
    });
  });

  describe('markChapterComplete', () => {
    it('adds chapter to completed list and saves', () => {
      const progress = markChapterComplete('chap1');
      expect(progress.completedChapters).toContain('chap1');
      expect(localStorage.getItem(KEY)).toContain('chap1');
    });

    it('does not duplicate chapter in completed list', () => {
      markChapterComplete('chap1');
      const progress = markChapterComplete('chap1');
      expect(progress.completedChapters).toEqual(['chap1']);
    });
  });

  describe('rememberHero', () => {
    it('sets the hero and saves', () => {
      rememberHero('hero1');
      const progress = loadProgress();
      expect(progress.hero).toBe('hero1');
    });
  });

  describe('resetProgress', () => {
    it('resets progress to default', () => {
      markChapterComplete('chap1');
      resetProgress();
      const progress = loadProgress();
      expect(progress).toEqual({ completedChapters: [], hero: undefined, freePlay: false });
    });
  });

  describe('setFreePlay', () => {
    it('sets freePlay flag and saves', () => {
      const progress = setFreePlay(true);
      expect(progress.freePlay).toBe(true);

      const saved = loadProgress();
      expect(saved.freePlay).toBe(true);
    });
  });

  describe('isChapterUnlocked', () => {
    it('unlocks if freePlay is true', () => {
      expect(isChapterUnlocked('chap2', [], true)).toBe(true);
    });

    it('unlocks first chapter', () => {
      expect(isChapterUnlocked('prologue', [])).toBe(true);
    });

    // We can't mock CHAPTERS easily here, but we'll assume there are chapters.
    // Given chapters are fetched from CHAPTERS array.
  });
});
