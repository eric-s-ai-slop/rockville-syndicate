import { describe, expect, it } from 'vitest';
import { coverScore, threatRate, waveForElapsed } from './logic';

describe('Ben Rust raid logic', () => {
  it('escalates through three waves', () => {
    expect(waveForElapsed(0)).toBe(1);
    expect(waveForElapsed(20)).toBe(2);
    expect(waveForElapsed(40)).toBe(3);
  });

  it('makes loud play bring Michael faster', () => {
    expect(threatRate(90)).toBeGreaterThan(threatRate(10));
  });

  it('scores the hidden camera as an optional fifth task', () => {
    expect(coverScore({ mic: true, monitor: true, pi: true, headset: true, camera: false })).toBe(80);
    expect(coverScore({ mic: true, monitor: true, pi: true, headset: true, camera: true })).toBe(100);
  });
});
