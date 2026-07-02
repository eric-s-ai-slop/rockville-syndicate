// Pure boss-phase math, split out of index.ts so it can be unit-tested without Phaser.
// Phase is inverted: 1 = lowest HP (most dangerous), 3 = full HP. Keep that convention —
// it matches BossConfig.phaseBarks and the rest of bossFight/index.ts.
export type BossPhase = 1 | 2 | 3;

export function getBossPhase(hpRatio: number): BossPhase {
  return hpRatio < 0.33 ? 1 : hpRatio < 0.66 ? 2 : 3;
}

// Scales attackInterval so lower-HP phases attack faster (smaller multiplier = shorter interval).
export function getPhaseAttackMultiplier(phase: BossPhase): number {
  return phase === 1 ? 0.7 : phase === 2 ? 0.85 : 1.0;
}
