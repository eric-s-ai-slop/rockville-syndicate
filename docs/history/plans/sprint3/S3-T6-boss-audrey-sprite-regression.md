> **ARCHIVED** — Historical sprint plan. Verify against current code before acting on any item.

# S3-T6 — Broken boss / Audrey sprites (regression from the directional-movement task)

> Fresh agent: read **Global House Rules** in `plans/sprint3/MASTER_PLAN_S3.md` first. This is the hardest task and
> it is a **heuristic computer-vision pipeline** — you MUST run the game and look at the sprites. A passing `tsc`
> proves nothing here.

## Symptom (owner's words)
"Assets are broken for Audrey, and boss assets seem broken for all bosses. I think one of the agents broke it, maybe
the first task 3."

## What actually broke it
Not task 3. The regression is commit **`215946d` "feat: implement 4-way directional movement and fix animation
frames"** (the most recent gameplay change before the current branch). It:
- rewrote `src/game/SpritePreprocessor.ts` row-mapping — added a `if (rows.length >= 7) { ... } else { ... }` split and
  new directional frame arrays (`walkFront/Side/Back`, `idleFront/Side/Back`),
- changed `src/game/ChapterScene.ts` to register `_front`/`_side`/`_back` anim variants and rewrote
  `applyDirectionalAnim()` for 4-way facing.

Every boss showcase sheet (and Audrey) is **≤6 rows**, so they take the `else` (standard 3–4 row) branch — which this
commit also touched — and/or get mis-classified by the changed row-grouping. Result: garbled/mis-cropped boss frames
and wrong animation playback in fights.

## Your region
- `src/game/SpritePreprocessor.ts` — the `preprocessShowcaseSheet()` row-mapping section (roughly **L345–489**: the
  `if (rows.length >= 7) ... else ...` block and the fallback guards after it).
- `src/game/ChapterScene.ts` — **only** the boss/hero sheet-building + anim-registration region (around **L480–560**)
  and `applyDirectionalAnim()`. Do **not** touch `create()`'s prop-extraction block (S3-T5 owns ~L405–423) or any
  combat method.

## Recommended approach (diagnose against last-known-good, then fix the common path)
1. **See the regression.** `git stash` nothing; just run the game on Audrey (`red_pee_bladder`, ch3 — controls are
   inverted there, that's expected) and one other boss (e.g. Eric ch1). Observe the broken sprite.
2. **Diff the suspect.** Compare current `SpritePreprocessor.ts` to its pre-regression version:
   ```bash
   git show 215946d~1:src/game/SpritePreprocessor.ts > /tmp/preproc_before.ts
   git diff --no-index /tmp/preproc_before.ts src/game/SpritePreprocessor.ts
   ```
   The bosses worked before this commit. Identify what in the rewritten `else` branch / row-grouping changed the crop
   for ≤6-row sheets.
3. **Fix the common (boss) path, keep directional gated.** The 4-way directional behavior should apply **only** to
   genuine 7+ row hero sheets. For everything else (all bosses, Audrey), the standard branch must reproduce the
   **pre-regression** mapping: row 0 → idle (reused for side/back), row 1 → walk (reused for all directions), row 2 →
   attack/hurt, optional row 3 → victory/defeat. Ensure:
   - `idleSide/idleBack` fall back to `idleFront`, and `walkSide/walkBack` fall back to `walk`, when the sheet has no
     dedicated directional rows (so `applyDirectionalAnim` never references an empty/garbage frame).
   - The end-of-function fallback guards (`if (xFrames.length === 0) ...`) still cover every array.
4. **Make `applyDirectionalAnim` degrade gracefully.** For a boss whose `_side`/`_back` anims were registered as
   copies of the front/walk anim, 4-way facing should just flip X on a single walk cycle — never play a missing anim
   key. Guard every `play('<key>')` with `this.anims.exists('<key>')` (the codebase already uses this pattern).

If the cleanest, lowest-risk fix is to **restore the pre-`215946d` standard-branch mapping verbatim** for ≤6-row
sheets while leaving the new `>=7` directional branch for hero sheets, do that. Correct bosses now beat clever
directional code that breaks them.

## Accept criteria (visual — non-negotiable)
- Audrey's boss sprite renders as a clean, correctly-cropped character that idles, walks (toward the player), and plays
  its attack — no garbled/sliced/offset frames, no stray background card.
- Every other boss (Eric, Florida, Michael/`boss_ben`, Nick F) renders and animates correctly in its fight.
- Heroes still move 4-directionally (don't regress commit `215946d`'s *intended* hero improvement).
- No "Texture has no frame N" warnings in the console during any boss fight.
- `npx tsc --noEmit` and `npm run build` clean.

## Verify (this is the real test)
`npm run dev`, then visit **each** boss via Free Play (chapter-select toggle): ch1 Eric, ch3 Audrey, ch5 Florida, ch6
Michael, ch7 Nick F. Watch each spawn, move, and attack. Screenshot Audrey + one other boss in your PR. Check the
browser console for frame warnings. If you cannot reach a boss quickly, use the chapter-select Free Play mode to jump
straight in.

## Coordination note
You touch `create()` (anim registration ~L480–560) and S3-T5 touches `create()` (prop extraction ~L405–423) — different
blocks, disjoint hunks. **Rebase on `main`** before finalizing and re-locate by the anim-registration code (search
`registerAnim(\`boss_`), not by line number. Land this PR before S3-T5 per the master merge order.