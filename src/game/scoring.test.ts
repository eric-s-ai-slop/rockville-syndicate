import { describe, it, expect } from 'vitest';
import { computeRunScore, ghostBeatenIndex } from './scoring';

describe('computeRunScore', () => {
  it('calculates score correctly for normal difficulty with positive inputs', () => {
    // shards * 200 + hp * 10 + ledger * 5
    // 5 * 200 + 10 * 10 + 20 * 5 = 1000 + 100 + 100 = 1200
    expect(computeRunScore(5, 10, 20, 'normal')).toBe(1200);
  });

  it('applies easy difficulty multiplier correctly', () => {
    // 1200 * 0.75 = 900
    expect(computeRunScore(5, 10, 20, 'easy')).toBe(900);
  });

  it('applies hard difficulty multiplier correctly', () => {
    // 1200 * 1.5 = 1800
    expect(computeRunScore(5, 10, 20, 'hard')).toBe(1800);
  });

  it('ignores negative hpRemaining and ledgerTotal (clamps to 0)', () => {
    // shards * 200 + 0 * 10 + 0 * 5
    // 5 * 200 = 1000
    expect(computeRunScore(5, -10, -20, 'normal')).toBe(1000);
  });

  it('rounds the final score correctly', () => {
    // base: 1 * 200 + 1 * 10 + 1 * 5 = 215
    // easy multiplier: 0.75
    // 215 * 0.75 = 161.25 -> rounds to 161 (round down)
    expect(computeRunScore(1, 1, 1, 'easy')).toBe(161);

    // base: 2 * 200 + 2 * 10 + 1 * 5 = 425
    // easy multiplier: 0.75
    // 425 * 0.75 = 318.75 -> rounds to 319 (round up)
    expect(computeRunScore(2, 2, 1, 'easy')).toBe(319);
  });
});

describe('ghostBeatenIndex', () => {
  it('returns the index of the first ghost beaten', () => {
    expect(ghostBeatenIndex(6000)).toBe(0); // Beats 5200 (ERH)
    expect(ghostBeatenIndex(5000)).toBe(1); // Beats 4850 (NKF)
    expect(ghostBeatenIndex(4101)).toBe(2); // Beats 4100 (NBF)
    expect(ghostBeatenIndex(3321)).toBe(3); // Beats 3320 (ARL)
    expect(ghostBeatenIndex(2811)).toBe(4); // Beats 2810 (SJF)
  });

  it('handles exact target scores by beating the next lowest target', () => {
    expect(ghostBeatenIndex(5200)).toBe(1); // ties 5200 (ERH), beats 4850 (NKF)
    expect(ghostBeatenIndex(4850)).toBe(2); // ties 4850 (NKF), beats 4100 (NBF)
  });

  it('returns -1 if no ghost is beaten', () => {
    expect(ghostBeatenIndex(2810)).toBe(-1); // Tie with last ghost
    expect(ghostBeatenIndex(1000)).toBe(-1); // Worse than last ghost
  });
});
