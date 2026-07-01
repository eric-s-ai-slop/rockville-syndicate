import type { BenClaim, Verdict } from './claims';

// Pure round construction + scoring for the "Common Ben L" minigame. Kept free of
// Phaser so it can be unit-tested without a canvas (see round.test.ts).

export interface RoundConfig {
  /** Number of prompts drawn for the round. */
  count: number;
  /** Timer for the first card (ms); ramps down toward `minPromptMs` per card. */
  perPromptMs: number;
  /** Floor the per-card timer ramps down to. */
  minPromptMs: number;
  /** Strikes (wrong sorts + timeouts) allowed before the run is lost. */
  strikesAllowed: number;
  /** Optional seed for deterministic decks (tests, pinned E2E). */
  seed?: number;
}

export const DEFAULT_ROUND: RoundConfig = {
  count: 16,
  perPromptMs: 3500,
  minPromptMs: 1800,
  strikesAllowed: 3,
  seed: undefined,
};

// Small deterministic PRNG (mulberry32). Seeded → reproducible decks for tests;
// unseeded → derive a seed from Date.now() so live play still varies.
function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** True when the player's chosen pad matches the claim's answer. */
export function scoreSort(claim: BenClaim, chosen: Verdict): boolean {
  return claim.answer === chosen;
}

/**
 * Build a balanced deck for one round.
 *
 * The source pool is lopsided (~10 CAN vs ~29 CAN'T) — that skew is the joke, but
 * a sorting game that's mostly "CAN'T" trains pad-spam. So we draw as close to a
 * 50/50 CAN/CAN'T split as the pools allow, guarantee `signature` cards up front,
 * and reorder to avoid more than two identical verdicts in a row.
 */
export function buildRound(claims: BenClaim[], cfg: RoundConfig): BenClaim[] {
  const rng = makeRng(cfg.seed ?? (Date.now() >>> 0));
  const count = Math.min(cfg.count, claims.length);

  const cans = shuffle(claims.filter((c) => c.answer === 'can'), rng);
  const cants = shuffle(claims.filter((c) => c.answer === 'cant'), rng);

  // Signatures first so the marquee lines always make the cut.
  const takeSignatures = (pool: BenClaim[]) => {
    const sig = pool.filter((c) => c.signature);
    const rest = pool.filter((c) => !c.signature);
    return [...sig, ...rest];
  };
  const canQueue = takeSignatures(cans);
  const cantQueue = takeSignatures(cants);

  // Target a 50/50 split, then top up from whichever pool has slack if one side
  // can't cover its half.
  let wantCan = Math.floor(count / 2);
  let wantCant = count - wantCan;
  if (wantCan > canQueue.length) {
    wantCant += wantCan - canQueue.length;
    wantCan = canQueue.length;
  }
  if (wantCant > cantQueue.length) {
    wantCan += wantCant - cantQueue.length;
    wantCant = cantQueue.length;
  }

  const picked = shuffle(
    [...canQueue.slice(0, wantCan), ...cantQueue.slice(0, wantCant)],
    rng,
  );

  return dealAvoidingRuns(picked, 2);
}

/** Reorder greedily so no verdict repeats more than `maxRun` times consecutively. */
function dealAvoidingRuns(cards: BenClaim[], maxRun: number): BenClaim[] {
  const out: BenClaim[] = [];
  const pool = cards.slice();
  while (pool.length) {
    let idx = 0;
    if (out.length >= maxRun) {
      const tail = out.slice(-maxRun);
      const runAnswer = tail.every((c) => c.answer === tail[0].answer)
        ? tail[0].answer
        : null;
      if (runAnswer) {
        const alt = pool.findIndex((c) => c.answer !== runAnswer);
        if (alt >= 0) idx = alt;
      }
    }
    out.push(pool.splice(idx, 1)[0]);
  }
  return out;
}

/** Per-card timer, linearly ramping from `perPromptMs` down to `minPromptMs`. */
export function promptDuration(cfg: RoundConfig, index: number, total: number): number {
  if (total <= 1) return cfg.perPromptMs;
  const t = index / (total - 1);
  return Math.round(cfg.perPromptMs + (cfg.minPromptMs - cfg.perPromptMs) * t);
}
