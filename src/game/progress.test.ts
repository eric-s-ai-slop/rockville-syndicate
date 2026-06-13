import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  loadProgress,
  saveProgress,
  markChapterComplete,
  rememberHero,
  resetProgress,
  isChapterUnlocked,
  setFreePlay,
} from './progress';

const KEY = 'omega-progress-v1';

// Mock CHAPTERS data
vi.mock('../data/chapters', () => ({
  CHAPTERS: [
    { id: 'ch1' },
    { id: 'ch2' },
    { id: 'ch3' },
  ],
}));

describe('progress', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('loadProgress', () => {
    it('returns empty completedChapters if none exists', () => {
      expect(loadProgress()).toEqual({ completedChapters: [] });
    });

    it('returns loaded progress', () => {
      localStorage.setItem(KEY, JSON.stringify({ completedChapters: ['ch1'], hero: 'eric', freePlay: true }));
      expect(loadProgress()).toEqual({ completedChapters: ['ch1'], hero: 'eric', freePlay: true });
    });

    it('handles malformed progress', () => {
      localStorage.setItem(KEY, 'not json');
      expect(loadProgress()).toEqual({ completedChapters: [] });
    });

    it('handles invalid progress schema', () => {
        localStorage.setItem(KEY, JSON.stringify({ completedChapters: 'not an array' }));
        expect(loadProgress()).toEqual({ completedChapters: [], hero: undefined, freePlay: false });
    });
  });

  describe('saveProgress', () => {
    it('saves progress to localStorage', () => {
      saveProgress({ completedChapters: ['ch1'], hero: 'eric' });
      expect(JSON.parse(localStorage.getItem(KEY)!)).toEqual({ completedChapters: ['ch1'], hero: 'eric' });
    });
  });

  describe('markChapterComplete', () => {
    it('adds chapter to completedChapters', () => {
      markChapterComplete('ch1');
      expect(loadProgress().completedChapters).toContain('ch1');
    });

    it('does not add duplicates', () => {
      markChapterComplete('ch1');
      markChapterComplete('ch1');
      expect(loadProgress().completedChapters).toEqual(['ch1']);
    });
  });

  describe('rememberHero', () => {
    it('saves hero', () => {
      rememberHero('eric');
      expect(loadProgress().hero).toBe('eric');
    });
  });

  describe('resetProgress', () => {
    it('clears completedChapters', () => {
      markChapterComplete('ch1');
      resetProgress();
      expect(loadProgress().completedChapters).toEqual([]);
    });
  });

  describe('isChapterUnlocked', () => {
    it('first chapter is always unlocked', () => {
      expect(isChapterUnlocked('ch1', [])).toBe(true);
    });

    it('unlocks if freePlay is true', () => {
        expect(isChapterUnlocked('ch3', [], true)).toBe(true);
    });

    it('unlocks if previous chapter is complete', () => {
      expect(isChapterUnlocked('ch2', ['ch1'])).toBe(true);
    });

    it('does not unlock if previous chapter is not complete', () => {
      expect(isChapterUnlocked('ch2', [])).toBe(false);
      expect(isChapterUnlocked('ch3', ['ch1'])).toBe(false);
    });

    it('returns true if chapter is not found', () => {
      // index -1 will trigger the idx <= 0 condition
      expect(isChapterUnlocked('unknown', [])).toBe(true);
    });
  });

  describe('setFreePlay', () => {
    it('updates freePlay', () => {
      setFreePlay(true);
      expect(loadProgress().freePlay).toBe(true);
      setFreePlay(false);
      expect(loadProgress().freePlay).toBe(false);
    });
  });
});
