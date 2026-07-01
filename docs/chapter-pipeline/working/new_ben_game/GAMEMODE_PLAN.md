# Minigame Plan — "Common Ben L" (action trivia sort)

Design plan for a new `GameMode` built from `things-ben-can-do.csv`. Grounded in the
real interfaces in `src/game/modes/types.ts` and the recipe in
`docs/ADDING_A_MINIGAME.md`. Nothing here is built yet — this is the spec to build from.

---

## 1. Concept & fantasy

The CSV is a roast: a short list of things Ben **CAN** do (say useless facts, get
catfished, take L's, bench 185…) and a long list of things he **CAN'T** (math,
park a car, hold his alc, walk normal, "#COMMONBENL"…). The minigame turns that
roast into a fast **CAN / CAN'T sorting** game with a physical action layer, so it
reads as a minigame and not a quiz.

**The loop:** a claim card drops in center screen ("Park a car", "Bench 185").
The player physically commits Ben to one of two pads — **CAN (left)** or **CAN'T
(right)** — before a shrinking timer bar empties. Correct sorts build a streak;
wrong sorts (or letting the timer run out) cost a strike. The joke pays off in the
mechanic: **"Take L's" is a CAN**, so eating a wrong answer is itself on-brand.

Working title: **Common Ben L**. Mode id: `benTrivia`.

---

## 2. Why "run to a pad" over the alternatives

Three action layers were considered:

| Option | Reuse | Feel | Verdict |
|--------|-------|------|---------|
| Aim + shoot the correct target | projectiles group, combat aim | good, but combat-coded — reads like a boss fight | no |
| Keyboard tap A=CAN / D=CAN'T | trivial | fast but static; not really "action" | no |
| **Ben dashes onto a CAN / CAN'T floor pad** | player sprite + physics + `applyDirectionalAnim` | movement-driven, uses the character, easy to read | **yes** |

The pad-dash keeps the protagonist sprite central, reuses walk animation and
physics that every scene already has, and stays visually distinct from the
`bossFight` combat mode. Keyboard A/D remains as a parity fallback (same pattern
as `complicityReport`'s Enter/Space listener) so the mode is playable without
precise movement.

---

## 3. Data model (pure, testable)

Split the mode the way `groupChat` is split: a **pure logic module** (`claims.ts`
+ `round.ts`) with unit tests, and a thin **Phaser presentation** layer
(`index.ts`). The CSV is transcribed once into a typed constant — we do **not**
parse CSV at runtime.

```ts
// claims.ts
export type Verdict = 'can' | 'cant';

export interface BenClaim {
  text: string;
  answer: Verdict;
  signature?: boolean;   // guaranteed-appearance marquee cards
}

export const BEN_CLAIMS: BenClaim[] = [
  // ── CAN ──
  { text: 'Say random useless facts', answer: 'can' },
  { text: 'Get catfished',            answer: 'can' },
  { text: "Take L's",                 answer: 'can', signature: true },
  { text: 'Waste money',              answer: 'can' },
  { text: 'Bench 185',                answer: 'can', signature: true },
  // …the rest of column A
  // ── CAN'T ──
  { text: 'Math',                     answer: 'cant' },
  { text: 'Park a car',               answer: 'cant' },
  { text: 'Hold his alc',             answer: 'cant' },
  { text: 'Walk normal',              answer: 'cant' },
  { text: '#COMMONBENL',              answer: 'cant', signature: true },
  // …the rest of column B
];
```

**Content note:** the CSV has a couple of entries that are edgelord/inside-joke
one-liners ("Autism, Doofus…", "Loving Father", tierlist jabs, party quotes).
Before shipping I'll flag these to you (see §10) — some want softening or cutting
so the card copy holds up outside the group chat. The transcription step is where
we decide the final shortlist.

---

## 4. Round construction (pure, testable)

The source list is deliberately lopsided — **~10 CAN vs ~28 CAN'T**. That
imbalance *is* the joke, but a sorting game where the answer is "CAN'T" 74% of the
time trains the player to spam one pad. So the round builder balances the deck:

```ts
// round.ts
export interface RoundConfig {
  count: number;          // prompts this round (default 8)
  perPromptMs: number;    // timer per card (default 3500, ramps down)
  strikesAllowed: number; // default 3
  seed?: number;          // deterministic for tests
}

export function buildRound(claims: BenClaim[], cfg: RoundConfig): BenClaim[];
```

Rules the builder enforces (all unit-tested):
- Aim for a ~50/50 CAN/CAN'T split despite the skewed source pool.
- Every `signature` card that fits the count is included ("#COMMONBENL",
  "Bench 185", "Take L's") — these are the crowd-pleasers.
- No back-to-back identical verdict more than twice (anti-pad-spam).
- Deterministic under `seed` so tests assert exact sequences.
- `perPromptMs` ramps down each card for escalation (floor ~1800ms).

Keeping `buildRound` and a pure `scoreSort(claim, chosen)` outside Phaser is what
makes this testable without a canvas — same discipline as
`groupChat/timeline.test.ts`.

---

## 5. Scoring, win / lose

- **Correct sort:** +1, streak++, `showPassiveIconText` a green "CAN ✓" pop and a
  Kenney confirm SFX.
- **Wrong sort / timeout:** strike++, streak resets, red "COMMON BEN L" flash +
  `showDamageNumber`. Optionally `damagePlayer` for stakes if run blocking.
- **Ben Meter:** streak drives an on-screen meter for juice; a full streak round
  triggers a "HE'S LOCKED IN" banner (rare, funny because it never happens).
- **End states → `ModeResult`:**
  - Cleared the round under the strike cap → `{ outcome: 'win', data: { score, maxStreak } }`
  - Hit `strikesAllowed` → `{ outcome: 'lose' }`
- `onComplete` is called **exactly once** (guarded by a `modeEnded` flag, same as
  `complicityReport`).
- The chapter beat can set `loseGoto` to branch narrative on a loss (the beat type
  already supports it: `types.ts:146`).

---

## 6. Architecture & files

Mirror `groupChat`'s split so logic is unit-tested and the Phaser layer stays thin:

```
src/game/modes/benTrivia/
  index.ts          # GameMode<BenTriviaConfig> — presentation + input + lifecycle
  claims.ts         # BEN_CLAIMS constant (CSV transcribed once)
  round.ts          # buildRound(), scoreSort() — pure
  round.test.ts     # deterministic round + scoring tests (vitest)
```

`index.ts` responsibilities, all through the `ModeContext` façade (never reach
into `ChapterScene`):
- `start()`: build the round; draw the two floor pads (CAN left / CAN'T right)
  with `add` rectangles + `label`; wire A/D keys and pad-overlap detection;
  show the first card. Freeze story movement while blocking.
- `update()`: advance the timer bar; detect which pad Ben overlaps (or A/D
  pressed); on commit, score and advance to the next card.
- `teardown()`: destroy every tracked GameObject, timers, and key listeners
  (track them in an array like `complicityReport.allObjects`), null the callback.

Register in `src/game/modes/index.ts`:
```ts
import { benTriviaMode } from './benTrivia';
registerMode(benTriviaMode);
```

Config type:
```ts
export interface BenTriviaConfig {
  count?: number;
  perPromptMs?: number;
  strikesAllowed?: number;
  seed?: number;        // pin for E2E determinism
}
```

---

## 7. Presentation & juice (reused helpers)

- `label(...)` for every text element (never raw `add.text` — DPR rule from CLAUDE.md).
- `showLetterbox()` / `hideLetterbox()` to frame the round as a bit.
- `showPassiveIconText` / `showDamageNumber` for correct/wrong feedback.
- `logMessage` to narrate ("BEN L #3") on the HUD board.
- `audioController` for a light music duck during the round; Kenney confirm/deny
  SFX per the existing asset inventory.
- Depth ≥ 9600 with `setScrollFactor(0)`, oversized bg rect, and camera-zoom-aware
  layout (`W / cam.zoom`) — copy the exact conventions from
  `complicityReport/index.ts` so it survives zoom and wide viewports.

---

## 8. Chapter integration

Drop a beat into whichever chapter hosts the roast (Ch0 Maria-Brooke already leans
into the catfish/GC material, so it's a natural fit):

```ts
{
  type: 'minigame',
  modeId: 'benTrivia',
  introLines: ['Sort the facts. CAN he? Or is it a common Ben L?'],
  config: { count: 8, strikesAllowed: 3 },
  background: false,        // blocking — this is a full-attention beat
  loseGoto: '<beat-id>',    // optional narrative branch on a loss
}
```

---

## 9. Test & verify plan

- **Unit (`round.test.ts`):** seeded `buildRound` yields the expected balanced
  sequence; signatures always present; no >2 same-verdict runs; `scoreSort`
  correctness. This is the required "pure logic" test per the recipe.
- **Lint:** `npm run lint` (tsc noEmit) — config typed via the generic, no `any`.
- **Manual:** `npm run dev` (port 3324), play the hosting chapter, confirm win and
  lose (hit the strike cap) both resolve and that `loseGoto` branches.

---

## 10. Decisions I made vs. what needs your call

**Decided (sensible defaults, reversible):**
- Pad-dash action layer over shoot/tap.
- Balanced round deck instead of honoring the raw 10/28 skew.
- `groupChat`-style pure/presentation split with unit tests.

**Needs your input before build:**
1. **Card copy / tone.** Several CSV lines are inside-joke edgelord one-liners
   ("Autism, Doofus. Hella. Dumb.", "Loving Father", "Bottom of Renee's
   tierlist", the Halloween quote). Keep verbatim, soften, or cut? I'd trim the
   ones that name real people or read as mean-spirited out of context.
2. **Host chapter & stakes.** Which chapter, and should a wrong sort cost real HP
   (`damagePlayer`) or just a strike?
3. **Length/difficulty.** Default is 8 cards, 3 strikes, timer ramping 3500→1800ms.
   Longer/harder?

Once you answer §10, this is a ~4-file build following the recipe end to end.
