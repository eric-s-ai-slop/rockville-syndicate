import { describe, expect, it } from 'vitest';
import { allocatedTotal, benBudgetFix } from './logic';

describe('Ben F1 budget', () => {
  const items = [
    { name: 'FOOD', cost: 800 },
    { name: 'HOUSING', cost: 2000 },
    { name: 'RACING SUIT', cost: 1200 },
  ];

  it('totals only selected career expenses', () => {
    expect(allocatedTotal(items, new Set(['FOOD', 'RACING SUIT']))).toBe(2000);
  });

  it('solves any budget by deleting housing, according to Ben', () => {
    expect([...benBudgetFix(new Set(['FOOD', 'HOUSING', 'RACING SUIT']))]).toEqual(['FOOD', 'RACING SUIT']);
  });
});
