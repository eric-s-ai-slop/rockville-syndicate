import { describe, expect, it } from 'vitest';
import { clampMeter, exactSelection, nextSequenceStep, poolMissTier } from './logic';

describe('Ben memory game logic', () => {
  it('accepts only the exact absurd roof plan', () => {
    const plan = ['Pressure cooker', 'M4', '11 hostages'];
    expect(exactSelection(plan, plan)).toBe(true);
    expect(exactSelection([...plan, 'Spare key'], plan)).toBe(false);
    expect(exactSelection(['Screwdriver'], plan)).toBe(false);
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
