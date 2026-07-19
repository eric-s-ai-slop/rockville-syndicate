import { describe, expect, it } from 'vitest';
import { coverScore, threatRate, waveForElapsed } from './logic';

describe('Ben Rust raid logic', () => {
  it('escalates through three waves', () => {
    expect(waveForElapsed(0)).toBe(1);
    expect(waveForElapsed(20)).toBe(2);
    expect(waveForElapsed(40)).toBe(3);
  });

  describe('threatRate', () => {
    it('makes loud play bring Michael faster', () => {
      expect(threatRate(90)).toBeGreaterThan(threatRate(10));
    });

    it('calculates expected rate for valid noise levels', () => {
      expect(threatRate(0)).toBeCloseTo(2.1);
      expect(threatRate(50)).toBeCloseTo(3.0);
      expect(threatRate(100)).toBeCloseTo(3.9);
    });

    it('clamps noise below 0', () => {
      expect(threatRate(-10)).toBeCloseTo(2.1);
      expect(threatRate(-100)).toBeCloseTo(2.1);
    });

    it('clamps noise above 100', () => {
      expect(threatRate(110)).toBeCloseTo(3.9);
      expect(threatRate(500)).toBeCloseTo(3.9);
    });
  });

  it('scores the hidden camera as an optional fifth task', () => {
    expect(coverScore({ mic: true, monitor: true, pi: true, headset: true, camera: false })).toBe(80);
    expect(coverScore({ mic: true, monitor: true, pi: true, headset: true, camera: true })).toBe(100);
  });
});
