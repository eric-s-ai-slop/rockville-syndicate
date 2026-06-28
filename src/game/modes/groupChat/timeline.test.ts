import { describe, it, expect } from 'vitest';
import { TIMELINE, PHASE_DIVIDER_INDEX } from './timeline';

describe('Group Chat Timeline', () => {
  it('should not be empty', () => {
    expect(TIMELINE.length).toBeGreaterThan(0);
  });

  it('should be sorted chronologically by time (t)', () => {
    for (let i = 1; i < TIMELINE.length; i++) {
      expect(TIMELINE[i].t).toBeGreaterThanOrEqual(TIMELINE[i - 1].t);
    }
  });

  it('should have a valid PHASE_DIVIDER_INDEX', () => {
    expect(PHASE_DIVIDER_INDEX).toBeGreaterThanOrEqual(0);
    expect(PHASE_DIVIDER_INDEX).toBeLessThan(TIMELINE.length);
    expect(TIMELINE[PHASE_DIVIDER_INDEX].duck).toBe(true);
  });
});
