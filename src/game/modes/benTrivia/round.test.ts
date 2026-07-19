import { describe, it, expect } from 'vitest';
import { BEN_CLAIMS } from './claims';
import {
  buildRound,
  scoreSort,
  promptDuration,
  DEFAULT_ROUND,
  type RoundConfig,
} from './round';

const seeded = (over: Partial<RoundConfig> = {}): RoundConfig => ({
  ...DEFAULT_ROUND,
  seed: 42,
  ...over,
});

describe('claims data', () => {
  it('every claim has a valid verdict and non-empty text', () => {
    for (const c of BEN_CLAIMS) {
      expect(c.text.length).toBeGreaterThan(0);
      expect(c.answer === 'can' || c.answer === 'cant').toBe(true);
    }
  });

  it('has both verdicts represented', () => {
    expect(BEN_CLAIMS.some((c) => c.answer === 'can')).toBe(true);
    expect(BEN_CLAIMS.some((c) => c.answer === 'cant')).toBe(true);
  });
});

describe('scoreSort', () => {
  it('is correct only when the chosen pad matches the answer', () => {
    expect(scoreSort({ text: 'Math', answer: 'cant' }, 'cant')).toBe(true);
    expect(scoreSort({ text: 'Math', answer: 'cant' }, 'can')).toBe(false);
    expect(scoreSort({ text: 'Bench 185', answer: 'can' }, 'can')).toBe(true);
  });

  it('rejects invalid inputs when chosen does not match answer', () => {
    expect(scoreSort({ text: 'Pass exam', answer: 'can' }, 'cant')).toBe(false);
  });
});

describe('buildRound', () => {
  it('returns exactly `count` cards when the pool is large enough', () => {
    const deck = buildRound(BEN_CLAIMS, seeded({ count: 16 }));
    expect(deck).toHaveLength(16);
  });

  it('is deterministic under a fixed seed', () => {
    const a = buildRound(BEN_CLAIMS, seeded()).map((c) => c.text);
    const b = buildRound(BEN_CLAIMS, seeded()).map((c) => c.text);
    expect(a).toEqual(b);
  });

  it('balances CAN / CAN\'T close to 50/50 despite a skewed pool', () => {
    const deck = buildRound(BEN_CLAIMS, seeded({ count: 16 }));
    const cans = deck.filter((c) => c.answer === 'can').length;
    const cants = deck.filter((c) => c.answer === 'cant').length;
    expect(Math.abs(cans - cants)).toBeLessThanOrEqual(1);
  });

  it('includes signature cards when the count has room', () => {
    const deck = buildRound(BEN_CLAIMS, seeded({ count: 16 }));
    const sigs = BEN_CLAIMS.filter((c) => c.signature);
    for (const s of sigs) {
      expect(deck.some((c) => c.text === s.text)).toBe(true);
    }
  });

  it('never repeats the same verdict more than twice in a row', () => {
    const deck = buildRound(BEN_CLAIMS, seeded({ count: 16 }));
    let run = 1;
    for (let i = 1; i < deck.length; i++) {
      run = deck[i].answer === deck[i - 1].answer ? run + 1 : 1;
      expect(run).toBeLessThanOrEqual(2);
    }
  });

  it('never emits duplicate claims within a round', () => {
    const deck = buildRound(BEN_CLAIMS, seeded({ count: 16 }));
    const texts = new Set(deck.map((c) => c.text));
    expect(texts.size).toBe(deck.length);
  });

  it('caps at pool size when count exceeds available claims', () => {
    const deck = buildRound(BEN_CLAIMS, seeded({ count: 999 }));
    expect(deck).toHaveLength(BEN_CLAIMS.length);
  });

  it('tops up from CAN pool if CAN\'T pool is too small to cover its half', () => {
    // Create a pool with lots of CANs and only 1 CANT
    const customPool = [
      { text: 'can1', answer: 'can' as const },
      { text: 'can2', answer: 'can' as const },
      { text: 'can3', answer: 'can' as const },
      { text: 'can4', answer: 'can' as const },
      { text: 'cant1', answer: 'cant' as const },
    ];
    // Request a 4-card round. 50/50 split means we want 2 CANs and 2 CANTs.
    // Since there's only 1 CANT, it should take 3 CANs and 1 CANT.
    const deck = buildRound(customPool, seeded({ count: 4 }));
    expect(deck).toHaveLength(4);
    const cans = deck.filter((c) => c.answer === 'can').length;
    const cants = deck.filter((c) => c.answer === 'cant').length;
    expect(cans).toBe(3);
    expect(cants).toBe(1);
  });
});

describe('promptDuration', () => {
  it('ramps from perPromptMs down to minPromptMs across the round', () => {
    const cfg = seeded({ count: 16, perPromptMs: 3500, minPromptMs: 1800 });
    expect(promptDuration(cfg, 0, 16)).toBe(3500);
    expect(promptDuration(cfg, 15, 16)).toBe(1800);
    expect(promptDuration(cfg, 7, 16)).toBeGreaterThan(1800);
    expect(promptDuration(cfg, 7, 16)).toBeLessThan(3500);
  });

  it('calculates exact expected durations with proper Math.round rounding', () => {
    const cfg = seeded({ perPromptMs: 3000, minPromptMs: 1000 });
    // total = 4. Indices: 0, 1, 2, 3.
    // index 1: 3000 + (-2000) * (1/3) = 2333.333... -> 2333
    // index 2: 3000 + (-2000) * (2/3) = 1666.666... -> 1667
    expect(promptDuration(cfg, 0, 4)).toBe(3000);
    expect(promptDuration(cfg, 1, 4)).toBe(2333);
    expect(promptDuration(cfg, 2, 4)).toBe(1667);
    expect(promptDuration(cfg, 3, 4)).toBe(1000);
  });

  it('returns the base duration for a single-card round', () => {
    const cfg = seeded({ count: 1 });
    expect(promptDuration(cfg, 0, 1)).toBe(cfg.perPromptMs);
  });

  it('returns the base duration for zero or negative total cards', () => {
    const cfg = seeded({ perPromptMs: 2500 });
    expect(promptDuration(cfg, 0, 0)).toBe(2500);
    expect(promptDuration(cfg, 0, -1)).toBe(2500);
  });
});
