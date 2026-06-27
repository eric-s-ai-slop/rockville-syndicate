# Track E — Tech Debt, Performance & Test Coverage (Execution Spec)

**Lane:** split — E1 → 🟦 Engineer C (their files); E2/E3 → 🟥 Engineer A (hot path + combat).
**Budget:** ~11h · **Phase:** 1 (E1) and 2 (E2/E3).

## Why
The game runs clean (`tsc` clean, 94/94 tests) but three things tax it: a noisy console that
buries real warnings, an expensive in-browser boot pipeline that causes the recurring
GPU-stall warnings and slow first paint, and test coverage skewed toward leaf utilities while
the actual *gameplay* (combat, beat dispatch) is barely covered.

## Hard rules
`tsc`/`build`/`test` gates. **Performance work must not change gameplay or physics rects.**
New tests use the existing Vitest setup (`vitest.setup.ts`, happy-dom, the `getContext` mock
patterns in `SpritePreprocessor.test.ts`/`PropExtractor.test.ts`).

---

## E1 — Console hygiene (~2h, Engineer C — see `TRACK_C_SYSTEMS_UI.md`)
Cross-referenced here for completeness. Fix the React border-shorthand warning in
`ChapterSelect.tsx` and set `willReadFrequently` on any read-back canvas in
`SpritePreprocessor.ts` that lacks it. **Acceptance:** clean console on a normal playthrough
(minus the Phaser-internal WebGL message addressed by E2).

---

## E2 — Boot-time asset pipeline performance (~5h, Engineer A)

**Goal:** Cut first-load jank and the source of the recurring
`GL Driver Message ... GPU stall due to ReadPixels` / `Canvas2D ... willReadFrequently`
warnings seen in every QA report.

**Current state:** boot runs a heavy **in-browser** pipeline:
- `SpritePreprocessor.ts` (1,382 lines) BFS-slices showcase JPGs into 8-row sprite grids
  using `getImageData` (color-key + bounding-box crops).
- `PropExtractor.ts` extracts prop subjects; `buildPackAtlas`/`buildFurnitureAtlas` bake atlases.
- All of this happens during scene `create()`/`preload()` (`ChapterScene.ts:536-838`) on the
  main thread, reading back pixels repeatedly → the GPU stalls and the readback warnings.

**Work (pick the lightest sufficient option; do not over-engineer):**
1. **Measure first.** Add timing around the preprocess/atlas calls; identify the worst
   offenders (likely the multi-sheet BFS slices). Don't optimize blind.
2. **Set `willReadFrequently: true`** on every offscreen canvas that calls `getImageData`
   (cheap, removes the Canvas2D warning, real speedup for repeated readbacks).
3. **Cache results across scene restarts.** Free Play replays a chapter → re-slicing the same
   JPGs is wasted work. Guard the slicers so an already-built texture/atlas key is reused
   (`buildFurnitureAtlas` already does this at `furnitureCatalog.ts:69-73` — extend the same
   pattern to the showcase slicer and pack atlas).
4. **Only-what-you-need.** Confirm the scene preprocesses just the sprites the *current*
   chapter needs, not the whole roster each load.
5. *(Stretch, only if measurement justifies it)* move the heaviest slicing off the main thread
   or precompute frame-rects offline so runtime just registers `tex.add(frame, ...)` instead
   of scanning pixels. The R11 watchwater approach (`tex.add('scene', x,y,w,h)`) is the model.

**Acceptance:** measurable drop in chapter-load time (report before/after); no `Canvas2D
willReadFrequently` warning; replaying a chapter in Free Play does not re-run the full slice;
no visual regression to any sprite/prop.

**Risk:** Medium — touches the boot path everyone depends on. Land early in Phase 2, behind
the existing fallbacks, and verify every chapter's sprites still render.

---

## E3 — Test coverage for gameplay (~4h, Engineer A)

**Goal:** Cover the code that actually runs the game. Today's 10 test files lean on utilities
(`SpritePreprocessor`, `PropExtractor`, `packSpriteAtlas`, `progress`, `audio`, `uiSound`,
`stewOffering`, `groupChat/parser`, `DialogueBox`, `chapters`). The **combat mode** and **beat
dispatch** — the highest-churn, highest-risk code, now being changed by Track A — have ~none.

**Work — add focused unit tests for:**
1. **`bossFight` logic** (extract pure helpers where needed so they're testable without a live
   Phaser scene, mocking `ModeContext`):
   - `damageBoss`: HP clamps at 0; `boss_ben_umbc` physical-hit deflection deals 0; defeat
     fires once at ≤0.
   - **A5 fix:** the damage applied equals the *selected* QTE's `damage`, not always
     `weaknessQTE.damage` (regression test for the bug A5 fixes).
   - QTE success/fail branches call the right outcome.
2. **A4 power-ups:** `applyPowerUp(id)` maps each `effectType` to the right state change and
   cleans up on expiry / teardown (no leak across chapters).
3. **A3 difficulty:** `DIFFICULTY_MODS` applied to boss HP/speed/cadence and `damagePlayer`.
4. **Settings migration (P0):** legacy-keys → v2 migration and corrupt-blob → defaults
   (co-own with Engineer C).
5. **Beat engine:** the dispatch table routes each `Beat.type` to the right handler; `goto`/
   `routeOnMinigame` resolve to the correct beat id.

**Acceptance:** new tests pass and meaningfully exercise combat/beat logic; total suite stays
green; the A5 damage bug has a red-then-green regression test.

## Budget
E1 2 (Phase 1, C) · E2 5 (Phase 2, A) · E3 4 (Phase 2, A) = 11h.
Cut order if tight: E2 stretch item (#5) → E3 beat-engine tests last.
