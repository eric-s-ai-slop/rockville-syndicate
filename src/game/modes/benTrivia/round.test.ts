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
});

describe('promptDuration', () => {
  it('ramps from perPromptMs down to minPromptMs across the round', () => {
    const cfg = seeded({ count: 16, perPromptMs: 3500, minPromptMs: 1800 });
    expect(promptDuration(cfg, 0, 16)).toBe(3500);
    expect(promptDuration(cfg, 15, 16)).toBe(1800);
    expect(promptDuration(cfg, 7, 16)).toBeGreaterThan(1800);
    expect(promptDuration(cfg, 7, 16)).toBeLessThan(3500);
  });

  it('returns the base duration for a single-card round', () => {
    const cfg = seeded({ count: 1 });
    expect(promptDuration(cfg, 0, 1)).toBe(cfg.perPromptMs);
  });
});
