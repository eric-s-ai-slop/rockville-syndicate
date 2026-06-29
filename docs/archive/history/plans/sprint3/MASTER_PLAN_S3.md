> **ARCHIVED** — Historical sprint plan. Verify against current code before acting on any item.

# Sprint 3 — Bug-Fix Master Plan (Architect's Brief)

**Author:** Architect agent (knows the whole codebase).
**Audience:** ~50 parallel Jules / Gemini 3.1 Pro agents that **cannot talk to each other**.
**Workflow:** each task = one branch + one PR off `main`. A human orchestrator merges PRs in the order given below.

This file is the map. Every numbered task has its own self-contained file (`S3-T*.md`) that a
**cold agent with zero prior context** can execute. Do not assume an agent has read anything but its own task file
+ this section's "Global House Rules".

---

## The coordination problem (read this first)

50 agents, no shared memory, no inter-agent messaging. If two agents edit the **same lines** of the same file and
both open PRs off `main`, the second merge conflicts. The entire plan is therefore engineered around one rule:

> **Each task owns a disjoint *region* (a named method / contiguous block) of a file.**
> Non-overlapping hunks in the same file merge cleanly even when both branch from `main`.

`src/game/ChapterScene.ts` (3384 lines) is the hot file — five different bugs live in it. They are assigned to
**different methods** so they never touch the same hunk. The cardinal discipline for every agent:

- **Surgical diff only.** Touch *only* the method/region your task names. No reformatting, no import reordering,
  no "while I'm here" cleanups, no Prettier-on-save across the file. A drive-by whitespace change to an unrelated
  function is what turns a clean parallel merge into a conflict.
- If your fix seems to need a change outside your region, **stop and note it in your PR description** instead of
  editing it. The architect will route it.

---

## Global House Rules (every task must obey)

1. **Stack:** Phaser 3.88.2 + React + Vite + TypeScript. **No new dependencies.**
2. **Graceful fallback:** every asset access stays guarded (`this.textures.exists(...)`, `this.cache.audio.exists(...)`,
   `safeLoadImage`/`safeLoadAudio`). Never introduce a hard crash when an asset is missing.
3. **Do not change physics/collision rects** unless the task explicitly says to.
4. **Definition of done:** `npx tsc --noEmit` clean *(pre-existing test-file type errors from missing `@playwright/test`,
   `vitest`, `@testing-library/react` are NOT yours — ignore them; introduce zero **new** errors)* **and**
   `npm run build` clean.
5. **Surgical diff** scoped to your named region (see coordination rule above).
6. **PR description must state:** root cause, the exact change, how you verified, and any out-of-region issue you spotted
   but did NOT touch.

---

## Task index

| ID | Title | Primary file(s) | Region (anchor) | Parallel-safe? |
|----|-------|-----------------|-----------------|----------------|
| **S3-T1** | Mission-select visual feedback | `src/components/ChapterSelect.tsx` | whole file (isolated) | ✅ fully independent |
| **S3-T2** | Audio mix + dialogue blip won't stop | `src/components/DialogueBox.tsx`, `src/game/ChapterScene.ts` | DialogueBox typewriter effect + music-volume block `~L1849–1936` | ✅ disjoint region |
| **S3-T3** | Nick F deals no damage (Spain boss) | `src/game/ChapterScene.ts` | `dischargeRefundRosterChecks()` `~L2394–2407` | ✅ disjoint region |
| **S3-T4** | Multiple copies of Eric boss | `src/game/ChapterScene.ts` | `summonBossMatch()` head `~L2411` + `spawnLevelEnemy()` `~L2243` | ✅ disjoint region |
| **S3-T5** | Broken car asset (I-95 / Florida) | `src/game/ChapterScene.ts`, `src/game/PropExtractor.ts` | `create()` extraction list `~L405–423` + `generatePropsAtlas()` `~L3102` | ✅ disjoint region |
| **S3-T6** | Broken boss / Audrey sprites (regression) | `src/game/SpritePreprocessor.ts`, `src/game/ChapterScene.ts` | preprocessor row-mapping + anim-registration `~L480–560` / `applyDirectionalAnim` | ⚠️ biggest; needs runtime visual check |
| **S3-T7** | Per-chapter QA sweep (fan-out) | none (read-only reports) | one chapter per agent | ✅ N parallel, no code |

Anchors are **method names first, line numbers second** — line numbers drift as PRs land; always locate by method name.

---

## Root-cause summary (so the orchestrator understands the triage)

- **T1 — selection feedback looks static:** `ChapterSelect.tsx` sets `className="... ring-2"` for the selected row,
  but the inline `style={{ boxShadow: ... }}` on the **same element** overrides Tailwind's ring (the ring *is* a
  box-shadow). Net effect: the only selected-state change is a subtle border color ≈ the unselected color. Needs a
  clearly visible, non-clobbered selected state.
- **T2a — text noise never stops:** `DialogueBox.tsx` plays a pooled `new Audio(DIALOG_BLIP_URL)` per typed char. On
  line-change / unmount / skip it clears the *timer* but never **stops the audio elements**, so an in-flight blip
  (the mp3 is not a tiny tick) keeps playing after the text finishes / the box closes.
- **T2b — mix is off:** music tweens to `0.48`/boss `0.62` (`ChapterScene` `~L1851/1896`), dialogue blip is `0.35`
  (`DialogueBox` `playBlip`). Music too loud, text too quiet.
- **T3 — Nick F no damage:** `dischargeRefundRosterChecks()` builds refund-check rects and calls
  `this.physics.add.overlap(this.player, check, …)` **without ever giving `check` a physics body**
  (`this.physics.add.existing(check)` is missing — compare `fireBossCoinAttack()` which does it). Overlap can't fire →
  zero damage. It is Nick F's *only* damage source.
- **T4 — duplicate Eric:** `summonBossMatch()` creates a new boss sprite and overwrites `this.spawnedBoss` with **no
  idempotency guard** and never destroys a prior instance. Eric (ch1, `boss_eric`, the `BOSSES[0]` default) is reachable
  from both the wave-clear auto-summon (`spawnLevelEnemy()`) and the scripted path; any double-trigger orphans the first
  sprite on screen.
- **T5 — broken car:** `generatePropsAtlas()` packs the **raw** car JPGs (gray photo background intact) into
  `small_props_atlas`, and that atlas is what the renderer draws (`~L942`). `extractPropSubject()` (the background
  remover added in TASK-01) is wired **only** to `['bg_hospital_room','bg_jungle_gym','bg_cars_01']` — never to
  `prop_nick_f_corolla` / `prop_jordan_mustang` / `prop_maharko_camero`, and even if it were, the atlas is built
  *before* extraction from the raw textures. Two compounded bugs → car shows its gray background.
- **T6 — broken boss/Audrey sprites:** regression from commit `215946d` ("4-way directional movement"), which rewrote
  `SpritePreprocessor.ts` row-mapping (added the `rows.length >= 7` branch) and changed `ChapterScene` anim
  registration + `applyDirectionalAnim`. All boss sheets (≤6 rows) and Audrey now mis-crop / mis-map. This is a
  heuristic CV pipeline — **requires running the game and looking at the sprites**, not just a code read.

---

## Recommended merge order

Most tasks are region-disjoint and merge in any order. Two pairs are *adjacent* in `ChapterScene.ts` and should be
sequenced to keep merges trivial (rebase-on-main between them; the orchestrator does this, agents don't):

1. **T1** (isolated) — merge anytime.
2. **T6** then **T5** — both touch `create()`, in different blocks; land T6 first (bigger), rebase T5.
3. **T3** then **T4** — `dischargeRefundRosterChecks()` (~2407) and `summonBossMatch()` (~2411) are adjacent; land T3,
   rebase T4.
4. **T2** (music block ~1849–1936 + DialogueBox) — merge anytime; no overlap with the above.
5. **T7** reports are read-only docs — merge freely or just collect them; they feed a *second wave* of fix tasks.

Each `ChapterScene.ts` task file instructs the agent to **rebase on `main` and re-locate by method name** before
finalizing, so a late merge still applies cleanly.

---

## Using the 50 agents well

There are only ~6 code tasks — most of the fleet should run **S3-T7**: a read-only, per-chapter QA sweep. Assign
**one chapter per agent** (8 story chapters + interludes). Each agent plays its chapter, fills the structured report
template, and opens a docs-only PR under `plans/sprint3/qa/<chapter-id>.md`. Zero code = zero conflicts = perfectly
parallel. The architect triages those reports into a **Sprint 3.5 fix wave**, again region-partitioned. This is how
"get rid of every single bug" is executed without 50 agents trampling each other.