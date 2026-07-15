import { describe, expect, it } from 'vitest';
import { exposurePerSecond, stageForElapsed, ventRoom } from './logic';

describe('Ocean City containment logic', () => {
  it('escalates through three distinct stages', () => {
    expect(stageForElapsed(0)).toBe(1);
    expect(stageForElapsed(20)).toBe(2);
    expect(stageForElapsed(45)).toBe(3);
  });

  it('makes washing useful without granting immunity', () => {
    expect(exposurePerSecond(80, true)).toBeGreaterThan(0);
    expect(exposurePerSecond(80, true)).toBeLessThan(exposurePerSecond(80, false));
  });

  it('makes venting remove a large, predictable amount of contamination', () => {
    expect(ventRoom(90)).toBe(38);
    expect(ventRoom(20)).toBe(0);
  });
});
