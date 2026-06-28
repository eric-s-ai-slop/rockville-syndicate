import { describe, it, expect } from 'vitest';
import { ghostBeatenIndex, computeRunScore } from './scoring';

describe('scoring', () => {
  describe('ghostBeatenIndex', () => {
    it('returns -1 if score is lower than or equal to the lowest target', () => {
      expect(ghostBeatenIndex(0)).toBe(-1);
      expect(ghostBeatenIndex(2810)).toBe(-1);
    });

    it('returns the index of the first beaten target', () => {
      expect(ghostBeatenIndex(2811)).toBe(4);
      expect(ghostBeatenIndex(4101)).toBe(2);
      expect(ghostBeatenIndex(5201)).toBe(0);
    });

    it('handles exact target scores by beating the next lowest target', () => {
      expect(ghostBeatenIndex(5200)).toBe(1); // 5200 doesn't beat 5200, but beats 4850
      expect(ghostBeatenIndex(4850)).toBe(2);
    });
  });

  describe('computeRunScore', () => {
    it('calculates score correctly for normal difficulty', () => {
      // 5 * 200 + 10 * 10 + 20 * 5 = 1000 + 100 + 100 = 1200
      expect(computeRunScore(5, 10, 20, 'normal')).toBe(1200);
    });

    it('applies easy difficulty multiplier (0.75x)', () => {
      expect(computeRunScore(5, 10, 20, 'easy')).toBe(900);
    });

    it('applies hard difficulty multiplier (1.5x)', () => {
      expect(computeRunScore(5, 10, 20, 'hard')).toBe(1800);
    });

    it('ignores negative hpRemaining and ledgerTotal', () => {
      // 5 * 200 + max(0, -10)*10 + max(0, -20)*5 = 1000
      expect(computeRunScore(5, -10, -20, 'normal')).toBe(1000);
    });
  });
});
