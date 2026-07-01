// Source of truth for the "Common Ben L" sorting minigame.
//
// Transcribed verbatim (typos, casing, and all) from
// docs/chapter-pipeline/working/new_ben_game/things-ben-can-do.csv — the roast is
// the point, so do NOT "clean up" the copy. Column A → answer:'can',
// column B → answer:'cant'. `signature` cards are the marquee lines the round
// builder guarantees when they fit (see round.ts).

export type Verdict = 'can' | 'cant';

export interface BenClaim {
  text: string;
  answer: Verdict;
  signature?: boolean;
}

export const BEN_CLAIMS: BenClaim[] = [
  // ── Things ben CAN do ──────────────────────────────────────────────────────
  { text: 'say random Useless facts', answer: 'can' },
  { text: 'Get catfished', answer: 'can' },
  { text: "Take L's", answer: 'can', signature: true },
  { text: 'wasting money', answer: 'can' },
  { text: 'adding 5 year olds on quick add', answer: 'can' },
  { text: 'pretend to be drunk at home alone on parents alc (Embarrassing)', answer: 'can' },
  { text: 'Use reddit', answer: 'can' },
  { text: 'Bench 185', answer: 'can', signature: true },
  { text: 'Geforce training (LOL)', answer: 'can' },
  { text: 'Autism, Doofus. Hella. Dumb. (A.D.H.D)', answer: 'can' },

  // ── Things ben CAN'T do ────────────────────────────────────────────────────
  { text: 'Math', answer: 'cant' },
  { text: 'Women', answer: 'cant' },
  { text: 'Buy lunch', answer: 'cant' },
  { text: 'Race', answer: 'cant' },
  { text: 'handle his money', answer: 'cant' },
  { text: 'Park a car', answer: 'cant' },
  { text: 'Basketball', answer: 'cant' },
  { text: 'Loving Father', answer: 'cant' },
  { text: '#COMMONBENL', answer: 'cant', signature: true },
  { text: 'Selling his $1000 item (knife)', answer: 'cant' },
  { text: 'walk normal', answer: 'cant' },
  { text: 'Sit normal', answer: 'cant' },
  { text: 'hold his Alc', answer: 'cant' },
  { text: 'Rust', answer: 'cant' },
  { text: 'Destiny', answer: 'cant' },
  { text: 'car games', answer: 'cant' },
  { text: 'Every game', answer: 'cant' },
  { text: 'Doing homework', answer: 'cant' },
  { text: 'Shopping clothes', answer: 'cant' },
  { text: 'No Drip', answer: 'cant' },
  { text: 'Picking good shoes', answer: 'cant' },
  { text: 'taking a shower (Smelly).', answer: 'cant' },
  { text: 'Sleep past 7PM', answer: 'cant' },
  { text: 'beating 9 year olds in go karts', answer: 'cant' },
  { text: 'Maintaining a reasonable insta ratio.', answer: 'cant' },
  { text: '"Who invited this kid" (Halloween party)', answer: 'cant' },
  { text: 'FN', answer: 'cant' },
  { text: 'SAT', answer: 'cant' },
  { text: 'Bottom of Renees tierlist', answer: 'cant' },
];
