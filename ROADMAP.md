# Roadmap

Forward-looking tech debt and feature work. Items here are **verified against current
source**, not copied from stale handoff docs. The 100h planning pass's execution specs and
the completed July 2026 improvement batch are archived under `docs/archive/`.
**Active batch: [docs/IMPROVEMENT_BATCH_2026-07B.md](docs/IMPROVEMENT_BATCH_2026-07B.md)**
(agent hygiene pass — E2E stability, zero-warning lint, screenSpace convergence).
This file is the lightweight, prioritized index.

Legend: 🔴 player-visible bug · 🟠 real debt · 🟡 nice-to-have · ⚪ speculative

---

## Tech Debt

### 🟠 Per-NPC sprite config is a hardcoded table
`src/game/scene/SpriteLoader.ts:192` — `npcSheets` hardcodes `cols`/`frontCol` per NPC.
Fine for the current fixed roster; revisit only if NPC count grows or art is added by
someone who can't edit TS. **Lightest fix when needed:** colocate the per-sheet metadata
with the sheet asset rather than a JSON pipeline.

### 🟡 `react-hooks/exhaustive-deps` warning in `GameLayout.tsx`
Real stale-closure risk, unlike the rest of the ESLint warnings (~160 of `no-explicit-any` /
`no-unused-vars`, which are low-value noise and not worth batching). Worth a real look on
its own.

---

## Features / Developments

(Existing detailed specs — pull into active work as capacity allows.)

- **July 2026 improvement batch (DONE)** — `docs/archive/IMPROVEMENT_BATCH_2026-07.md`:
  Ch8 endings bug fix, ledger/sfx audio pass, mid-fight power-up drops,
  carRide→Ch2, entities.ts split, GameLayout extraction

- **Combat depth** — `docs/archive/COMBAT_DEPTH_PLAN.md`
- **Turn-based battle mode** — `docs/archive/TURN_BATTLE_GAMEMODE_PLAN.md`
- **Narration system** — `docs/archive/NARRATION_PLAN.md`
- **External-game pipeline** — `docs/archive/EXTERNAL_GAME_PIPELINE_PLAN.md`
- **Signature feature** — `docs/archive/TRACK_F_SIGNATURE_FEATURE.md` (Hall of Records shipped; see Done)
- **Content / visual track** — `docs/archive/TRACK_B_CONTENT_VISUAL.md`
- **Systems / UI track** — `docs/archive/TRACK_C_SYSTEMS_UI.md` (settings panel + save v2 shipped; see Done)
- **Audio track** — `docs/archive/TRACK_D_AUDIO.md`

---

## Done (recent)

- ✅ July 2026 Improvement Batch: Ch8 endings bug, ledger audio, power-up drops, carRide to Ch2, entities.ts split, GameLayout extraction
- ✅ Chapter 11 expansion, swarmSurvival minigame, speakerHunt refactor, storyFractures extension
- ✅ Decomposed `ChapterScene` god object into `scene/` subsystems (Actors, AudioController,
  BeatEngine, MapBuilder, Atmosphere, SpriteLoader)
- ✅ Expanded Playwright E2E suite (4 → 18 specs); E2E gate now required in CI
- ✅ Fixed loot collection bug surfaced during the decomposition
- ✅ Save schema v2 + unified settings store (`settings.ts`) with migration + corruption guard
- ✅ Settings panel with music/SFX/master volume sliders, reduce-motion, colorblind, difficulty
- ✅ Hall of Records + scoring system (`scoring.ts`) with ghost targets
- ✅ Ch8 music: `cabin_basye` now plays Dark Beach (Pastel Ghost) instead of Ch1 track
- ✅ Door-open SFX on "The door opens." beat in Ch6; new `sfx` beat type added
- ✅ Portrait pop animation on speaker change in `DialogueBox.tsx`
- ✅ All prop types have real art or characterful procedural draws (B1 complete)
- ✅ `tag:` deprecated field fully removed from all chapter files (B3)
- ✅ Nick-F frame clamp via `frameTotal` (B4)
- ✅ `willReadFrequently` set on all pixel-readback canvases (E1)
- ✅ Border-shorthand React warning fixed in `ChapterSelect.tsx` (E1)
