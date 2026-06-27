# Track C — Systems, UI, Settings & Accessibility (Execution Spec)

**Lane:** 🟦 Engineer C · **Budget:** ~14h (foundation 4 + build 10) · **Phase:** 0 then 1
**Owns:** `GameLayout.tsx`, `ChapterSelect.tsx`, `DialogueBox.tsx`, `progress.ts`, `index.css`,
and the new settings store.

This lane builds the **shared foundation other lanes depend on**, then the player-facing
settings and accessibility on top of it. Engineer C's Phase-0 output is the project's
critical path — see the dependency note at the bottom.

> **Reality check:** Several "settings" already exist but are **fragmented**. GameLayout reads
> three *separate* localStorage keys — `omega-muted`, `omega-colorblind`, `omega-textscale`
> (`GameLayout.tsx:48-50`) — plus `omega-progress-v1` for `freePlay`. This track *consolidates
> and extends*, it doesn't start from zero. There's also a latent bug to fix:
> `loadProgress()` never returns `rose_silence` even though `setRoseSilence()` writes it
> (`progress.ts:21-25, 48-52`).

## Hard rules
`tsc`/`build`/`test` gates · **no side effects in `setState` updaters** (StrictMode — this
lane is the most React-heavy, so this rule bites hardest here) · square corners, `label()` for
any Phaser text · honor existing mute behavior.

---

## P0 — Save schema v2 + unified settings store (~4h, **blocking, do first**)

**Goal:** One typed source of truth for persisted state, with migration + corruption guard,
so A3 (difficulty) and the rest of Track C build on solid ground instead of more scattered keys.

**Current state:** `progress.ts` persists a flat `omega-progress-v1` blob
(`completedChapters, hero, freePlay, rose_silence`) with a `try/catch` read. Settings live in
three *other* keys. No versioning, no migration.

**Work:**
1. **Define `Settings`** (new module, e.g. `src/game/settings.ts`):
   ```ts
   interface Settings {
     masterVolume: number; musicVolume: number; sfxVolume: number; // 0..1
     muted: boolean;
     textScale: 1 | 1.25 | 1.5;
     textSpeedMs: number;          // dialogue typewriter, default 22
     difficulty: 'easy' | 'normal' | 'hard';
     colorBlind: boolean;
     reduceMotion: boolean;
   }
   ```
   `loadSettings()/saveSettings()/updateSettings(partial)` with sane defaults + `try/catch`.
2. **Bump the save schema to `omega-save-v2`** (or version inside the blob): on load, if v2 is
   absent, **migrate** from the legacy keys (`omega-progress-v1`, `omega-muted`,
   `omega-colorblind`, `omega-textscale`) into the unified shape, then write v2. Keep reading
   legacy as a one-time import; never lose a player's completed chapters.
3. **Corruption guard:** any parse failure → fall back to defaults (don't throw, don't wipe
   silently if recoverable). Add the `rose_silence` field back into `loadProgress()`'s return.
4. **Expose a tiny store** (a module singleton + a `useSettings()` hook, or lift into
   `GameLayout` state) so React UI and the Phaser scene read the same values. Phaser side:
   apply `muted`/volumes to `game.sound` and broadcast changes.

**Acceptance:** Fresh load migrates legacy keys with no data loss; corrupt blob → defaults, no
crash; one `useSettings()`/store read used by both React and Phaser; unit test for
migration + corruption (pairs with Track E).

**Gate:** merged to `main` before Phase 1 forks — A3 persistence and C1/C2 depend on it.

---

## C1 — Settings panel (~3h)

**Goal:** A real settings surface, replacing the lone header mute button.

**Current state:** only a mute toggle (`GameLayout.tsx:417-425`) + scattered textscale/colorblind.

**Work:**
1. Build a pixel-panel settings modal (square, matches R9/R6 aesthetic) reachable from the
   header and the hero/title screen.
2. Controls, all bound to the P0 store: **master / music / SFX volume sliders**, mute,
   text-speed, text-scale, difficulty (A3), color-blind, reduce-motion.
3. Wire volumes through `AudioController`/`game.sound` — the global crossfade targets a fixed
   0.30 today (`AudioController.ts:72`); multiply those targets by `musicVolume`, and SFX
   plays by `sfxVolume`. (Respect the per-track `music_ch6 → 0.70` special-case at
   `AudioController.ts:120` — scale it, don't flatten it.)
4. Changes apply live and persist immediately.

**Acceptance:** Every control changes the game in real time and survives reload; volumes
actually attenuate music + SFX independently; panel is keyboard-navigable.

---

## C2 — Accessibility (~3h)

**Goal:** Make it playable/enjoyable for the friends who aren't gamers and anyone sensitive to
flashing.

**Current state:** `textScale` (1/1.25/1.5) and `colorBlind` flags exist but are isolated;
no reduce-motion; combat leans hard on `cam.flash`/`cam.shake` (`bossFight` + `ChapterScene`).

**Work:**
1. **Reduce-motion:** a `reduceMotion` flag that caps/▾skips screen shake and flash. The
   actual caps in `ChapterScene.ts`/`bossFight` are made by **Engineer A** (hot-file rule); C
   provides the flag via the store and the toggle. Define a single `shakeIf()/flashIf()`
   helper A can route calls through.
2. **Color-blind accent:** ensure the flag actually swaps the theme accent everywhere it
   matters (HP states, damage-number colors, boss-phase colors) — today it may only affect a
   subset. Pick a CB-safe palette in `index.css`/palette.
3. **Text-scale:** confirm it applies to *all* UI (dialogue, HUD, menus), not just some; bump
   cramped spots.
4. **Keyboard-only navigation:** chapter select + settings fully operable without a mouse
   (arrows + enter). ChapterSelect already tracks `selectedIndex` — extend it.

**Acceptance:** Reduce-motion visibly tames shake/flash; CB accent applies game-wide;
text-scale affects all surfaces; full keyboard nav through menus.

---

## A3 (UI side) — Difficulty switch + persistence (~2h)

**Goal:** Surface the difficulty system (logic owned by Engineer A) as a player choice.

**Work:** A chunky 3-state pixel switch on the hero/title screen and in the settings panel,
bound to `settings.difficulty` in the P0 store. **Friends flavor:** label the tiers in-lore —
"D1 Consumerism" (easy) / "Normal" / "ARE YOU 291 LIQUID?" (hard) — enum stays stable.
Engineer A reads `settings.difficulty` → `DIFFICULTY_MODS` in the combat code.

**Acceptance:** Selecting a tier persists and visibly changes the next boss fight; default
`normal` plays identically to today.

---

## E1 — Console hygiene (~2h)  *(folded here — these are C's files)*

**Goal:** Clean console (it currently clutters every QA report).

**Work:**
1. Fix the React warning *"mixing shorthand and non-shorthand border properties"* — find where
   `borderColor` + `borderLeft`/`border` are set on the same element (reported in
   `ChapterSelect.tsx`; verify current line) and split into consistent longhand.
2. Set `willReadFrequently: true` on any offscreen 2D canvas that reads back pixels but doesn't
   yet (audit `SpritePreprocessor.ts`; `PropExtractor.ts` already does this at lines 27/32).
   (The WebGL ReadPixels-stall warning is a Phaser-internal texture-extraction artifact and is
   addressed structurally in Track E2, not here.)

**Acceptance:** No React style warning and no `willReadFrequently` warning during a normal
playthrough.

---

## Critical-path note for the lead
Engineer C does **P0 first and nothing else** until the settings store + schema v2 are merged.
A3 persistence, C1, and C2 all read that store; the combat lane's difficulty logic reads
`settings.difficulty`. If P0 slips, three workstreams slip. Protect it.

## Budget
P0 4 · C1 3 · C2 3 · A3-UI 2 · E1 2 = 14h (Track F signature feature is separate — see
`TRACK_F_SIGNATURE_FEATURE.md`).
