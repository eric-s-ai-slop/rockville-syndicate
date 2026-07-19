import { describe, it, expect } from 'vitest';
import { getBossPhase, getPhaseAttackMultiplier } from './phaseLogic';

describe('getBossPhase', () => {
  it('is phase 3 (full HP) at or above the 66% threshold', () => {
    expect(getBossPhase(1.0)).toBe(3);
    expect(getBossPhase(0.66)).toBe(3);
  });

  it('is phase 2 between the 33% and 66% thresholds', () => {
    expect(getBossPhase(0.65)).toBe(2);
    expect(getBossPhase(0.33)).toBe(2);
  });

  it('is phase 1 (lowest HP) below the 33% threshold', () => {
    expect(getBossPhase(0.32)).toBe(1);
    expect(getBossPhase(0)).toBe(1);
  });

  it('handles edge cases (negative, > 1, NaN)', () => {
    expect(getBossPhase(-0.1)).toBe(1);
    expect(getBossPhase(1.5)).toBe(3);
    expect(getBossPhase(NaN)).toBe(3);
  });
});

describe('getPhaseAttackMultiplier', () => {
  it('attacks fastest (smallest multiplier) in phase 1', () => {
    expect(getPhaseAttackMultiplier(1)).toBeLessThan(getPhaseAttackMultiplier(2));
    expect(getPhaseAttackMultiplier(2)).toBeLessThan(getPhaseAttackMultiplier(3));
  });

  it('matches the documented ×1.0/×0.85/×0.7 escalation', () => {
    expect(getPhaseAttackMultiplier(3)).toBe(1.0);
    expect(getPhaseAttackMultiplier(2)).toBe(0.85);
    expect(getPhaseAttackMultiplier(1)).toBe(0.7);
  });
});
