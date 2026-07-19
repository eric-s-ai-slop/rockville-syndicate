import { describe, expect, it } from 'vitest';
import { clampMeter, exactSelection, nextSequenceStep, poolMissTier } from './logic';

describe('Ben memory game logic', () => {
  describe('exactSelection', () => {
    const plan = ['Pressure cooker', 'M4', '11 hostages'];

    it('returns true for an exact match', () => {
      expect(exactSelection(plan, plan)).toBe(true);
    });

    it('returns true for an exact match regardless of order', () => {
      const outOfOrder = ['11 hostages', 'Pressure cooker', 'M4'];
      expect(exactSelection(outOfOrder, plan)).toBe(true);
    });

    it('returns false when selected has more items than required', () => {
      expect(exactSelection([...plan, 'Spare key'], plan)).toBe(false);
    });

    it('returns false when selected has fewer items than required', () => {
      expect(exactSelection(['Pressure cooker', 'M4'], plan)).toBe(false);
    });

    it('returns false for completely different items', () => {
      expect(exactSelection(['Screwdriver'], plan)).toBe(false);
      expect(exactSelection(['A', 'B', 'C'], plan)).toBe(false);
    });

    it('returns false when selected has same length but different items', () => {
      const different = ['Pressure cooker', 'M4', 'Fake hostage'];
      expect(exactSelection(different, plan)).toBe(false);
    });

    it('handles duplicates in selected iterable correctly', () => {
      const duplicates = ['Pressure cooker', 'M4', 'M4'];
      expect(exactSelection(duplicates, plan)).toBe(false);

      const duplicatesAllPresent = ['Pressure cooker', 'M4', '11 hostages', 'M4'];
      expect(exactSelection(duplicatesAllPresent, plan)).toBe(true);
    });
  });

  it('advances a correct panic combo and penalizes a wrong step without resetting it', () => {
    expect(nextSequenceStep(['A', 'B', 'C'], 0, 'A')).toEqual({ completed: 1, correct: true, done: false });
    expect(nextSequenceStep(['A', 'B', 'C'], 2, 'B')).toEqual({ completed: 1, correct: false, done: false });
    expect(nextSequenceStep(['A', 'B', 'C'], 2, 'C')).toEqual({ completed: 3, correct: true, done: true });
  });

  it('turns accuracy into different flavors of inevitable pool failure', () => {
    expect(poolMissTier(0.5)).toBe('tragic');
    expect(poolMissTier(0.7)).toBe('spectacular');
    expect(poolMissTier(0.95)).toBe('historic');
  });

  it('clamps escalating meters', () => {
    expect(clampMeter(-4)).toBe(0);
    expect(clampMeter(42)).toBe(42);
    expect(clampMeter(104)).toBe(100);
  });
});
