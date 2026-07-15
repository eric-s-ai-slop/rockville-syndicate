import { describe, expect, it } from 'vitest';
import { coughInterval, normalizedDirection } from './logic';

describe('Patient Zero difficulty', () => {
  it('escalates cough frequency without becoming unreadably fast', () => {
    expect(coughInterval(0, 36000)).toBe(1750);
    expect(coughInterval(18000, 36000)).toBe(1225);
    expect(coughInterval(36000, 36000)).toBe(700);
    expect(coughInterval(99999, 36000)).toBe(700);
  });

  it('normalizes diagonal movement so it is not faster', () => {
    const direction = normalizedDirection(1, 1);
    expect(Math.hypot(direction.x, direction.y)).toBeCloseTo(1);
    expect(normalizedDirection(0, 0)).toEqual({ x: 0, y: 0 });
  });
});
