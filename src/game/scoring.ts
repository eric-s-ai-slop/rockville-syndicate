// Run scoring — Hall of Records feature (Track F).
//
// Score formula:
//   shards × 200  +  hpRemaining × 10  +  max(0, ledger) × 5
//   × difficulty multiplier (0.75 / 1.0 / 1.5)
//
// Ghost targets are hardcoded in-joke high scores the player races against.
// They are never written to localStorage — they live here as a constant.

export interface RunRecord {
  chapterId: string;
  heroId: string;
  score: number;
  shardsCollected: number;
  ledgerTotal: number;
  hpRemaining: number;
  difficulty: 'easy' | 'normal' | 'hard';
  date: string; // ISO date string
}

export interface GhostTarget {
  initials: string;
  score: number;
}

// Per-chapter ghost targets — in-joke crew initials + scores to beat.
export const GHOST_TARGETS: GhostTarget[] = [
  { initials: 'ERH', score: 5200 },
  { initials: 'NKF', score: 4850 },
  { initials: 'NBF', score: 4100 },
  { initials: 'ARL', score: 3320 },
  { initials: 'SJF', score: 2810 },
];

const DIFFICULTY_SCORE_MULT: Record<'easy' | 'normal' | 'hard', number> = {
  easy: 0.75,
  normal: 1.0,
  hard: 1.5,
};

export function computeRunScore(
  shardsCollected: number,
  hpRemaining: number,
  ledgerTotal: number,
  difficulty: 'easy' | 'normal' | 'hard',
): number {
  const base = shardsCollected * 200 + Math.max(0, hpRemaining) * 10 + Math.max(0, ledgerTotal) * 5;
  return Math.round(base * DIFFICULTY_SCORE_MULT[difficulty]);
}

/** Returns the index of the first ghost target this score beats (or -1 if none). */
export function ghostBeatenIndex(score: number): number {
  return GHOST_TARGETS.findIndex(g => score > g.score);
}
