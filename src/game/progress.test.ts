import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadProgress, saveProgress, markChapterComplete, rememberHero, resetProgress, isChapterUnlocked, setFreePlay } from './progress';

const KEY = 'omega-progress-v1';

describe('progress', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('loadProgress', () => {
    it('returns empty progress when localStorage is empty', () => {
      expect(loadProgress()).toEqual({ completedChapters: [] });
    });

    it('returns parsed progress when localStorage has valid data', () => {
      localStorage.setItem(KEY, JSON.stringify({ completedChapters: ['chapter1'], hero: 'hero1', freePlay: true }));
      expect(loadProgress()).toEqual({ completedChapters: ['chapter1'], hero: 'hero1', freePlay: true });
    });

    it('handles missing fields gracefully', () => {
      localStorage.setItem(KEY, JSON.stringify({ completedChapters: ['chapter1'] }));
      expect(loadProgress()).toEqual({ completedChapters: ['chapter1'], hero: undefined, freePlay: false });
    });

    it('handles invalid json gracefully', () => {
      localStorage.setItem(KEY, 'invalid json');
      expect(loadProgress()).toEqual({ completedChapters: [] });
    });

    it('handles unexpected types gracefully', () => {
      localStorage.setItem(KEY, JSON.stringify({ completedChapters: 'not an array', hero: 123, freePlay: 'not a boolean' }));
      expect(loadProgress()).toEqual({ completedChapters: [], hero: undefined, freePlay: false });
    });

    it('handles localStorage throw', () => {
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('localStorage disabled'); });
      expect(loadProgress()).toEqual({ completedChapters: [] });
    });
  });

  describe('saveProgress', () => {
    it('saves progress to localStorage', () => {
      const progress = { completedChapters: ['chapter1'], hero: 'hero1', freePlay: true };
      saveProgress(progress);
      expect(localStorage.getItem(KEY)).toEqual(JSON.stringify(progress));
    });

    it('handles localStorage throw silently', () => {
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('localStorage disabled'); });
      expect(() => saveProgress({ completedChapters: [] })).not.toThrow();
    });
  });
});
