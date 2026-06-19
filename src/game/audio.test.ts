import { describe, it, expect } from 'vitest';
import { STAGE_MUSIC_URL, CHAPTER_MUSIC_KEY } from './audio';

describe('audio configurations', () => {
  describe('STAGE_MUSIC_URL', () => {
    it('should map chapter music keys to URLs', () => {
      expect(STAGE_MUSIC_URL).toBeDefined();
      expect(typeof STAGE_MUSIC_URL.music_ch1).toBe('string');
      expect(STAGE_MUSIC_URL).toHaveProperty('music_ch1');
      expect(STAGE_MUSIC_URL).toHaveProperty('music_umbc_basement');
    });

    it('should contain an entry for every music key referenced in CHAPTER_MUSIC_KEY', () => {
      const expectedKeys = new Set(Object.values(CHAPTER_MUSIC_KEY));

      expectedKeys.forEach(musicKey => {
        expect(STAGE_MUSIC_URL).toHaveProperty(musicKey);
        expect(typeof STAGE_MUSIC_URL[musicKey]).toBe('string');
        expect(STAGE_MUSIC_URL[musicKey].length).toBeGreaterThan(0);
      });
    });
  });
});
