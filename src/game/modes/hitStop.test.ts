import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { hitStop } from './hitStop';

describe('hitStop', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('applies default hit stop scale and duration', () => {
    const ctx = {
      physics: { world: { timeScale: 1 } },
      tweens: { timeScale: 1 },
    };

    hitStop(ctx);

    // Immediately changes timeScale
    expect(ctx.physics.world.timeScale).toBe(0.05);
    expect(ctx.tweens.timeScale).toBe(0.05);

    // Advance time by 79ms (before duration)
    vi.advanceTimersByTime(79);
    expect(ctx.physics.world.timeScale).toBe(0.05);
    expect(ctx.tweens.timeScale).toBe(0.05);

    // Advance time by 1ms (to reach 80ms duration)
    vi.advanceTimersByTime(1);
    expect(ctx.physics.world.timeScale).toBe(1);
    expect(ctx.tweens.timeScale).toBe(1);
  });

  it('applies custom scale and duration', () => {
    const ctx = {
      physics: { world: { timeScale: 1 } },
      tweens: { timeScale: 1 },
    };

    hitStop(ctx, 200, 0.1);

    expect(ctx.physics.world.timeScale).toBe(0.1);
    expect(ctx.tweens.timeScale).toBe(0.1);

    vi.advanceTimersByTime(199);
    expect(ctx.physics.world.timeScale).toBe(0.1);
    expect(ctx.tweens.timeScale).toBe(0.1);

    vi.advanceTimersByTime(1);
    expect(ctx.physics.world.timeScale).toBe(1);
    expect(ctx.tweens.timeScale).toBe(1);
  });
});
